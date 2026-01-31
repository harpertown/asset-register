import type { Route } from "./+types/api.registers";

// GET all registers
export async function loader({ context }: Route.LoaderArgs) {
	const db = context.cloudflare.env.DB;

	const registers = await db
		.prepare(
			`SELECT r.*, 
				(SELECT COUNT(*) FROM asset_groups WHERE register_id = r.id) as group_count,
				(SELECT COUNT(*) FROM assets a 
					JOIN asset_groups ag ON a.asset_group_id = ag.id 
					WHERE ag.register_id = r.id AND a.incomplete = 1) as incomplete_count
			FROM registers r
			ORDER BY r.created_at DESC`
		)
		.all();

	// For each register, get the asset groups and their assets
	const fullRegisters = await Promise.all(
		registers.results.map(async (register: any) => {
			const groups = await db
				.prepare(
					`SELECT * FROM asset_groups WHERE register_id = ? ORDER BY is_whole_site DESC, created_at ASC`
				)
				.bind(register.id)
				.all();

			const groupsWithAssets = await Promise.all(
				groups.results.map(async (group: any) => {
					const assets = await db
						.prepare(`SELECT * FROM assets WHERE asset_group_id = ? ORDER BY created_at ASC`)
						.bind(group.id)
						.all();

					const start = group.start_x !== null ? { x: group.start_x, y: group.start_y } : undefined;
					const end = group.end_x !== null ? { x: group.end_x, y: group.end_y } : undefined;
					const path = group.path ? JSON.parse(group.path) : undefined;

					// Convert API format to Room format
					let rect: { x: number; y: number; width: number; height: number } | undefined;
					let circle: { cx: number; cy: number; radius: number } | undefined;

					if (group.tool === "rectangle" && start && end) {
						rect = {
							x: start.x,
							y: start.y,
							width: end.x - start.x,
							height: end.y - start.y,
						};
					} else if (group.tool === "circle" && start && end) {
						const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
						circle = {
							cx: start.x,
							cy: start.y,
							radius,
						};
					}

					return {
						id: group.id,
						name: group.name,
						tool: group.tool,
						color: group.color,
						rect,
						circle,
						path,
						isWholeSite: Boolean(group.is_whole_site),
						assets: assets.results.map((asset: any) => ({
							id: asset.id,
							itemType: asset.item_type || "",
							name: asset.name,
							serialNumber: asset.serial_number || "",
							purchasePrice: asset.purchase_price || 0,
							purchaseDate: asset.purchase_date || "",
							photo: asset.photo,
							incomplete: Boolean(asset.incomplete),
						})),
					};
				})
			);

			return {
				id: register.id,
				address: register.address,
				sitePlan: register.site_plan,
				ownsLand: Boolean(register.owns_land),
				ownsBuildings: Boolean(register.owns_buildings),
				wizardCompleted: Boolean(register.wizard_completed),
				rooms: groupsWithAssets,
			};
		})
	);

	return Response.json(fullRegisters);
}

// POST create/update register, DELETE register
export async function action({ request, context }: Route.ActionArgs) {
	const db = context.cloudflare.env.DB;
	const method = request.method;

	if (method === "POST") {
		const data = await request.json();
		const { action: actionType, ...payload } = data;

		if (actionType === "create_register") {
			const id = `register-${Date.now()}`;
			await db
				.prepare(
					`INSERT INTO registers (id, address, site_plan, owns_land, owns_buildings, wizard_completed)
					VALUES (?, ?, ?, ?, ?, ?)`
				)
				.bind(
					id,
					payload.address,
					payload.sitePlan || null,
					payload.ownsLand ? 1 : 0,
					payload.ownsBuildings ? 1 : 0,
					payload.wizardCompleted ? 1 : 0
				)
				.run();

			return Response.json({ id, success: true });
		}

		if (actionType === "update_register") {
			await db
				.prepare(
					`UPDATE registers SET 
						address = ?, 
						site_plan = ?, 
						owns_land = ?, 
						owns_buildings = ?, 
						wizard_completed = ?,
						updated_at = datetime('now')
					WHERE id = ?`
				)
				.bind(
					payload.address,
					payload.sitePlan || null,
					payload.ownsLand ? 1 : 0,
					payload.ownsBuildings ? 1 : 0,
					payload.wizardCompleted ? 1 : 0,
					payload.id
				)
				.run();

			return Response.json({ success: true });
		}

		if (actionType === "delete_register") {
			await db.prepare(`DELETE FROM registers WHERE id = ?`).bind(payload.id).run();
			return Response.json({ success: true });
		}

		if (actionType === "create_asset_group") {
			const id = payload.id || `room-${Date.now()}`;
			await db
				.prepare(
					`INSERT INTO asset_groups (id, register_id, name, tool, color, start_x, start_y, end_x, end_y, path, is_whole_site)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					id,
					payload.registerId,
					payload.name,
					payload.tool || null,
					payload.color || null,
					payload.start?.x ?? null,
					payload.start?.y ?? null,
					payload.end?.x ?? null,
					payload.end?.y ?? null,
					payload.path ? JSON.stringify(payload.path) : null,
					payload.isWholeSite ? 1 : 0
				)
				.run();

			return Response.json({ id, success: true });
		}

		if (actionType === "update_asset_group") {
			await db
				.prepare(
					`UPDATE asset_groups SET 
						name = ?, 
						tool = ?, 
						color = ?, 
						start_x = ?, 
						start_y = ?, 
						end_x = ?, 
						end_y = ?, 
						path = ?,
						updated_at = datetime('now')
					WHERE id = ?`
				)
				.bind(
					payload.name,
					payload.tool || null,
					payload.color || null,
					payload.start?.x ?? null,
					payload.start?.y ?? null,
					payload.end?.x ?? null,
					payload.end?.y ?? null,
					payload.path ? JSON.stringify(payload.path) : null,
					payload.id
				)
				.run();

			return Response.json({ success: true });
		}

		if (actionType === "delete_asset_group") {
			await db.prepare(`DELETE FROM asset_groups WHERE id = ?`).bind(payload.id).run();
			return Response.json({ success: true });
		}

		if (actionType === "create_asset") {
			const id = payload.id || `asset-${Date.now()}`;
			await db
				.prepare(
					`INSERT INTO assets (id, asset_group_id, item_type, name, serial_number, purchase_price, purchase_date, photo, incomplete)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					id,
					payload.assetGroupId,
					payload.itemType || null,
					payload.name,
					payload.serialNumber || null,
					payload.purchasePrice || 0,
					payload.purchaseDate || null,
					payload.photo || null,
					payload.incomplete ? 1 : 0
				)
				.run();

			return Response.json({ id, success: true });
		}

		if (actionType === "update_asset") {
			await db
				.prepare(
					`UPDATE assets SET 
						item_type = ?, 
						name = ?, 
						serial_number = ?, 
						purchase_price = ?, 
						purchase_date = ?, 
						photo = ?, 
						incomplete = ?,
						updated_at = datetime('now')
					WHERE id = ?`
				)
				.bind(
					payload.itemType || null,
					payload.name,
					payload.serialNumber || null,
					payload.purchasePrice || 0,
					payload.purchaseDate || null,
					payload.photo || null,
					payload.incomplete ? 1 : 0,
					payload.id
				)
				.run();

			return Response.json({ success: true });
		}

		if (actionType === "delete_asset") {
			await db.prepare(`DELETE FROM assets WHERE id = ?`).bind(payload.id).run();
			return Response.json({ success: true });
		}

		return Response.json({ error: "Unknown action" }, { status: 400 });
	}

	return Response.json({ error: "Method not allowed" }, { status: 405 });
}
