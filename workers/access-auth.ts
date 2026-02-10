type AccessClaims = {
	aud: string | string[];
	iss: string;
	exp: number;
	nbf?: number;
	iat?: number;
	sub: string;
	email?: string;
	user_account_id?: string;
	org_id?: string;
	tier?: string;
	groups?: string[];
	roles?: string[];
	realm_access?: { roles?: string[] };
};

type AuthContext = {
	user: {
		sub: string;
		email?: string;
		userAccountId?: string;
		orgId?: string;
		tier?: string;
	};
	roles: string[];
	claims: AccessClaims;
};

type AuthResult = { request: Request; auth: AuthContext } | Response;

type JwtHeader = {
	alg?: string;
	kid?: string;
	typ?: string;
};

type Jwks = { keys: JsonWebKey[] };

type VerifiedJwt = {
	header: JwtHeader;
	claims: AccessClaims;
	headPayload: Uint8Array;
	signature: Uint8Array;
};

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
let cachedJwks: { jwks: Jwks; fetchedAt: number } | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getIssuer(env: Env) {
	return env.ACCESS_ISSUER || `https://${env.ACCESS_TEAM}.cloudflareaccess.com`;
}

function base64UrlToUint8Array(value: string) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function decodeJwtPart<T>(part: string): T {
	const bytes = base64UrlToUint8Array(part);
	const json = new TextDecoder().decode(bytes);
	return JSON.parse(json) as T;
}

function parseJwt(token: string): VerifiedJwt {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT format");
	}
	const [headerB64, payloadB64, signatureB64] = parts;
	const header = decodeJwtPart<JwtHeader>(headerB64);
	const claims = decodeJwtPart<AccessClaims>(payloadB64);
	const headPayload = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
	const signature = base64UrlToUint8Array(signatureB64);
	return { header, claims, headPayload, signature };
}

async function fetchJwks(env: Env): Promise<Jwks> {
	const cached = cachedJwks;
	const now = Date.now();
	if (cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
		return cached.jwks;
	}
	const url = `https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`;
	const response = await fetch(url, { headers: { accept: "application/json" } });
	if (!response.ok) {
		throw new Error(`Failed to fetch JWKS: ${response.status}`);
	}
	const jwks = (await response.json()) as Jwks;
	cachedJwks = { jwks, fetchedAt: now };
	return jwks;
}

async function verifyJwtSignature(env: Env, jwt: VerifiedJwt) {
	const alg = jwt.header.alg;
	if (alg !== "RS256") {
		throw new Error(`Unsupported JWT alg: ${alg ?? "unknown"}`);
	}
	const jwks = await fetchJwks(env);
	const kid = jwt.header.kid;
	let key = jwks.keys.find((jwk) => jwk.kid === kid);
	if (!key) {
		cachedJwks = null;
		const refreshed = await fetchJwks(env);
		key = refreshed.keys.find((jwk) => jwk.kid === kid);
	}
	if (!key) {
		throw new Error("No matching JWK for JWT kid");
	}
	const cryptoKey = await crypto.subtle.importKey(
		"jwk",
		key,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["verify"],
	);
	const verified = await crypto.subtle.verify(
		"RSASSA-PKCS1-v1_5",
		cryptoKey,
		jwt.signature,
		jwt.headPayload,
	);
	if (!verified) {
		throw new Error("JWT signature verification failed");
	}
}

function assertClaims(env: Env, claims: AccessClaims) {
	const now = Math.floor(Date.now() / 1000);
	if (claims.exp <= now) {
		throw new Error("JWT expired");
	}
	if (claims.nbf && claims.nbf > now) {
		throw new Error("JWT not yet valid");
	}
	const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
	if (!aud.includes(env.ACCESS_AUD)) {
		throw new Error("JWT audience mismatch");
	}
	const issuer = getIssuer(env);
	if (claims.iss !== issuer) {
		throw new Error("JWT issuer mismatch");
	}
}

function extractRoles(claims: AccessClaims): string[] {
	if (Array.isArray(claims.roles) && claims.roles.length > 0) {
		return claims.roles;
	}
	if (Array.isArray(claims.groups) && claims.groups.length > 0) {
		return claims.groups;
	}
	if (claims.realm_access?.roles && claims.realm_access.roles.length > 0) {
		return claims.realm_access.roles;
	}
	return [];
}

function isSafeMethod(method: string) {
	return SAFE_METHODS.has(method.toUpperCase());
}

function matchPathPrefix(pathname: string, prefix: string) {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function extractAccountIdFromPath(pathname: string) {
	const match = pathname.match(/^\/api\/(?:accounts|transactions|users)\/([^/]+)/i);
	return match?.[1];
}

function authorizeRequest(request: Request, auth: AuthContext) {
	const url = new URL(request.url);
	const pathname = url.pathname;
	if (!pathname.startsWith("/api")) {
		return;
	}
	const roles = new Set(auth.roles);
	if (roles.size === 0) {
		throw new Error("No roles present");
	}
	const isAdmin = roles.has("admin");
	const isAnalyst = roles.has("analyst");
	const isAuditor = roles.has("auditor");
	const isCustomerAdmin = roles.has("customer_admin");
	const isCustomerUser = roles.has("customer_user");
	const isEmployee = isAdmin || isAnalyst || isAuditor;
	const isCustomer = isCustomerAdmin || isCustomerUser;

	if (isEmployee) {
		if (matchPathPrefix(pathname, "/api/admin") && !isAdmin) {
			throw new Error("Admin role required");
		}
		if (matchPathPrefix(pathname, "/api/analytics") && !(isAdmin || isAnalyst)) {
			throw new Error("Analyst role required");
		}
		if (matchPathPrefix(pathname, "/api/audit") && !(isAdmin || isAuditor)) {
			throw new Error("Auditor role required");
		}
		if (!isAdmin && !isSafeMethod(request.method)) {
			throw new Error("Write access requires admin role");
		}
		if (!isAdmin) {
			const allowedPrefixes = ["/api/accounts", "/api/transactions", "/api/analytics", "/api/audit"];
			const allowed = allowedPrefixes.some((prefix) => matchPathPrefix(pathname, prefix));
			if (!allowed) {
				throw new Error("Route not allowed for role");
			}
		}
		return;
	}

	if (isCustomer) {
		if (matchPathPrefix(pathname, "/api/admin") || matchPathPrefix(pathname, "/api/analytics") || matchPathPrefix(pathname, "/api/audit")) {
			throw new Error("Route not allowed for customer role");
		}
		if (!isSafeMethod(request.method) && !isCustomerAdmin) {
			throw new Error("Write access requires customer_admin role");
		}
		const accountId = auth.user.userAccountId;
		if (!accountId) {
			throw new Error("Missing user_account_id claim");
		}
		const pathAccount = extractAccountIdFromPath(pathname);
		if (pathAccount && pathAccount !== accountId) {
			throw new Error("Account scope mismatch");
		}
		return;
	}

	throw new Error("Role not authorized");
}

function buildAuthContext(claims: AccessClaims): AuthContext {
	const roles = extractRoles(claims);
	return {
		user: {
			sub: claims.sub,
			email: claims.email,
			userAccountId: claims.user_account_id,
			orgId: claims.org_id,
			tier: claims.tier,
		},
		roles,
		claims,
	};
}

function enrichRequest(request: Request, auth: AuthContext): Request {
	const headers = new Headers(request.headers);
	headers.set("x-auth-sub", auth.user.sub);
	if (auth.user.email) {
		headers.set("x-auth-email", auth.user.email);
	}
	if (auth.user.userAccountId) {
		headers.set("x-user-account-id", auth.user.userAccountId);
	}
	if (auth.user.orgId) {
		headers.set("x-user-org-id", auth.user.orgId);
	}
	if (auth.user.tier) {
		headers.set("x-user-tier", auth.user.tier);
	}
	if (auth.roles.length > 0) {
		headers.set("x-user-roles", auth.roles.join(","));
	}
	return new Request(request, { headers });
}

export async function authenticateRequest(request: Request, env: Env): Promise<AuthResult> {
	if (env.ACCESS_AUTH_DISABLED === "true") {
		const now = Math.floor(Date.now() / 1000);
		const claims: AccessClaims = {
			aud: env.ACCESS_AUD,
			iss: getIssuer(env),
			exp: now + 3600,
			sub: "dev",
			user_account_id: "dev-account",
			org_id: "dev-org",
			tier: "dev",
			roles: ["admin"],
		};
		const auth = buildAuthContext(claims);
		return { request: enrichRequest(request, auth), auth };
	}

	const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
	if (!jwt) {
		return new Response("Unauthorized", { status: 401 });
	}
	try {
		const parsed = parseJwt(jwt);
		await verifyJwtSignature(env, parsed);
		assertClaims(env, parsed.claims);
		const auth = buildAuthContext(parsed.claims);
		authorizeRequest(request, auth);
		return { request: enrichRequest(request, auth), auth };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unauthorized";
		return new Response(message, { status: 403 });
	}
}

export type { AuthContext, AccessClaims };
