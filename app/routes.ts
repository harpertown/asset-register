import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("api/registers", "routes/api.registers.ts"),
	route("transactions/:registerId", "routes/transactions.tsx"),
] satisfies RouteConfig;
