import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("api/registers", "routes/api.registers.ts"),
] satisfies RouteConfig;
