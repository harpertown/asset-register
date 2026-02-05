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
					// Only get the latest version of each asset (those not superseded by newer versions)
					const assets = await db
						.prepare(`SELECT * FROM assets WHERE asset_group_id = ? AND id NOT IN (SELECT parent_asset_id FROM assets WHERE parent_asset_id IS NOT NULL) ORDER BY created_at ASC`)
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
							assetId: asset.asset_id || "",
							itemType: asset.item_type || "",
							name: asset.name,
							serialNumber: asset.serial_number || "",
							purchasePrice: asset.purchase_price || 0,
							purchaseDate: asset.purchase_date || "",
							photo: asset.photo,
							incomplete: Boolean(asset.incomplete),
							depnMethodAcc: asset.depn_method_acc || "",
							depnRateAcc: asset.depn_rate_acc || "",
							depnMethodTax: asset.depn_method_tax || "",
							depnRateTax: asset.depn_rate_tax || "",
							version: asset.version || 1,
							versionId: asset.version_id || asset.id,
							assetGuid: asset.asset_guid || asset.id,
							parentAssetId: asset.parent_asset_id || null,
							effectiveFrom: asset.effective_from || "",
							exemptionType: asset.exemption_type || (asset.version === 1 || !asset.parent_asset_id ? "Acquisition" : ""),
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
		const { action: actionType, ...payload } = data as { action: string; [key: string]: any };

		if (actionType === "create_register") {
			const id = crypto.randomUUID();
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
			const id = payload.id || crypto.randomUUID();
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
			const id = payload.id || crypto.randomUUID();
			const versionId = crypto.randomUUID();
			const assetGuid = crypto.randomUUID(); // Persistent asset identity
			await db
				.prepare(
					`INSERT INTO assets (id, asset_group_id, asset_id, item_type, name, serial_number, purchase_price, purchase_date, photo, incomplete, depn_method_acc, depn_rate_acc, depn_method_tax, depn_rate_tax, version_id, asset_guid, version)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
				)
				.bind(
					id,
					payload.assetGroupId,
					payload.assetId || null,
					payload.itemType || null,
					payload.name,
					payload.serialNumber || null,
					payload.purchasePrice || 0,
					payload.purchaseDate || null,
					payload.photo || null,
					payload.incomplete ? 1 : 0,
					payload.depnMethodAcc || null,
					payload.depnRateAcc || null,
					payload.depnMethodTax || null,
					payload.depnRateTax || null,
					versionId,
					assetGuid
				)
				.run();

			return Response.json({ id, versionId, assetGuid, success: true });
		}

		if (actionType === "update_asset") {
			// Build dynamic update query for partial updates
			const updates: string[] = [];
			const values: any[] = [];

			if (payload.assetId !== undefined) { updates.push("asset_id = ?"); values.push(payload.assetId || null); }
			if (payload.itemType !== undefined) { updates.push("item_type = ?"); values.push(payload.itemType || null); }
			if (payload.name !== undefined) { updates.push("name = ?"); values.push(payload.name); }
			if (payload.serialNumber !== undefined) { updates.push("serial_number = ?"); values.push(payload.serialNumber || null); }
			if (payload.purchasePrice !== undefined) { updates.push("purchase_price = ?"); values.push(payload.purchasePrice || 0); }
			if (payload.purchaseDate !== undefined) { updates.push("purchase_date = ?"); values.push(payload.purchaseDate || null); }
			if (payload.photo !== undefined) { updates.push("photo = ?"); values.push(payload.photo || null); }
			if (payload.incomplete !== undefined) { updates.push("incomplete = ?"); values.push(payload.incomplete ? 1 : 0); }
			if (payload.depnMethodAcc !== undefined) { updates.push("depn_method_acc = ?"); values.push(payload.depnMethodAcc || null); }
			if (payload.depnRateAcc !== undefined) { updates.push("depn_rate_acc = ?"); values.push(payload.depnRateAcc || null); }
			if (payload.depnMethodTax !== undefined) { updates.push("depn_method_tax = ?"); values.push(payload.depnMethodTax || null); }
			if (payload.depnRateTax !== undefined) { updates.push("depn_rate_tax = ?"); values.push(payload.depnRateTax || null); }
			if (payload.exemptionType !== undefined) { updates.push("exemption_type = ?"); values.push(payload.exemptionType || null); }

			if (updates.length === 0) {
				return Response.json({ success: true }); // Nothing to update
			}

			updates.push("updated_at = datetime('now')");
			values.push(payload.id);

			await db
				.prepare(`UPDATE assets SET ${updates.join(", ")} WHERE id = ?`)
				.bind(...values)
				.run();

			return Response.json({ success: true });
		}

		if (actionType === "delete_asset") {
			await db.prepare(`DELETE FROM assets WHERE id = ?`).bind(payload.id).run();
			return Response.json({ success: true });
		}

		if (actionType === "create_asset_version") {
			// Fetch the original asset
			const originalAsset = await db
				.prepare(`SELECT * FROM assets WHERE id = ?`)
				.bind(payload.originalAssetId)
				.first();

			if (!originalAsset) {
				return Response.json({ error: "Original asset not found" }, { status: 404 });
			}

			const newId = crypto.randomUUID(); // New row ID
			const newVersionId = crypto.randomUUID(); // New version GUID
			// Keep the same asset_guid (persistent asset identity)
			const assetGuid = (originalAsset as any).asset_guid || (originalAsset as any).id;
			const newVersion = ((originalAsset as any).version || 1) + 1;
			// Use provided effectiveFrom or default to current date
			const effectiveFrom = payload.effectiveFrom || new Date().toISOString().split("T")[0];

			// Create new version with original data + any overrides, keeping same asset_guid
			await db
				.prepare(
					`INSERT INTO assets (id, asset_group_id, asset_id, item_type, name, serial_number, purchase_price, purchase_date, photo, incomplete, depn_method_acc, depn_rate_acc, depn_method_tax, depn_rate_tax, version, parent_asset_id, effective_from, version_id, asset_guid, exemption_type)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					newId,
					(originalAsset as any).asset_group_id,
					payload.assetId ?? (originalAsset as any).asset_id,
					payload.itemType ?? (originalAsset as any).item_type,
					payload.name ?? (originalAsset as any).name,
					payload.serialNumber ?? (originalAsset as any).serial_number,
					payload.purchasePrice ?? (originalAsset as any).purchase_price,
					payload.purchaseDate ?? (originalAsset as any).purchase_date,
					payload.photo ?? (originalAsset as any).photo,
					payload.incomplete !== undefined ? (payload.incomplete ? 1 : 0) : (originalAsset as any).incomplete,
					payload.depnMethodAcc ?? (originalAsset as any).depn_method_acc,
					payload.depnRateAcc ?? (originalAsset as any).depn_rate_acc,
					payload.depnMethodTax ?? (originalAsset as any).depn_method_tax,
					payload.depnRateTax ?? (originalAsset as any).depn_rate_tax,
					newVersion,
					payload.originalAssetId,
					effectiveFrom,
					newVersionId,
					assetGuid,
					payload.exemptionType || ""
				)
				.run();

			return Response.json({ 
				id: newId,
				versionId: newVersionId,
				assetGuid,
				version: newVersion,
				effectiveFrom,
				success: true 
			});
		}

		if (actionType === "get_asset_versions") {
			// First verify the asset exists
			const initialAsset = await db
				.prepare(`SELECT id, parent_asset_id, asset_guid FROM assets WHERE id = ?`)
				.bind(payload.assetId)
				.first();
            
			if (!initialAsset) {
				console.log(`[get_asset_versions] Asset not found for id: ${payload.assetId}`);
				return Response.json({ versions: [] });
			}

			// Find the root asset by walking up the parent chain
			let currentId = payload.assetId;
			let rootId = currentId;
			let assetGuid = (initialAsset as any).asset_guid || initialAsset.id;

			// Walk up to find the root (an asset with no parent)
			for (let i = 0; i < 100; i++) { // Prevent infinite loops
				const asset = await db
					.prepare(`SELECT id, parent_asset_id, asset_guid FROM assets WHERE id = ?`)
					.bind(currentId)
					.first();
				if (!asset) break;
				if (!(asset as any).parent_asset_id) {
					rootId = currentId;
					assetGuid = (asset as any).asset_guid || asset.id;
					break;
				}
				currentId = (asset as any).parent_asset_id;
				rootId = currentId;
				assetGuid = (asset as any).asset_guid || asset.id;
			}

			// Get all assets with the same asset_guid
			const allVersions = await db
				.prepare(`SELECT * FROM assets WHERE asset_guid = ? ORDER BY version ASC`)
				.bind(assetGuid)
				.all();

			console.log(`[get_asset_versions] Queried asset_guid: ${assetGuid}, found ${allVersions.results.length} versions.`);

			const versions: any[] = [];
			for (const asset of allVersions.results) {
				versions.push({
					id: (asset as any).id,
					assetId: (asset as any).asset_id || "",
					itemType: (asset as any).item_type || "",
					name: (asset as any).name,
					serialNumber: (asset as any).serial_number || "",
					purchasePrice: (asset as any).purchase_price || 0,
					purchaseDate: (asset as any).purchase_date || "",
					photo: (asset as any).photo,
					incomplete: Boolean((asset as any).incomplete),
					depnMethodAcc: (asset as any).depn_method_acc || "",
					depnRateAcc: (asset as any).depn_rate_acc || "",
					depnMethodTax: (asset as any).depn_method_tax || "",
					depnRateTax: (asset as any).depn_rate_tax || "",
					version: (asset as any).version || 1,
					versionId: (asset as any).version_id || (asset as any).id,
					assetGuid: (asset as any).asset_guid || (asset as any).id,
					parentAssetId: (asset as any).parent_asset_id || null,
					effectiveFrom: (asset as any).effective_from || "",
					exemptionType: (asset as any).exemption_type || ((asset as any).version === 1 || !(asset as any).parent_asset_id ? "Acquisition" : ""),
				});
			}

			return Response.json({ versions });
		}

		if (actionType === "delete_asset_version") {
			const versionToDelete = await db
				.prepare(`SELECT * FROM assets WHERE id = ?`)
				.bind(payload.assetId)
				.first();

			if (!versionToDelete) {
				return Response.json({ error: "Version not found" }, { status: 404 });
			}

			const assetGuid = (versionToDelete as any).asset_guid;
			const parentId = (versionToDelete as any).parent_asset_id;

			// Count total versions of this asset
			// Method 1: Count by asset_guid if available
			let versionCount = 0;
			if (assetGuid) {
				const byGuid = await db
					.prepare(`SELECT COUNT(*) as count FROM assets WHERE asset_guid = ?`)
					.bind(assetGuid)
					.first();
				versionCount = (byGuid as any)?.count || 0;
			}
			
			// Method 2: Walk the parent/child chain to count all related versions
			// This handles legacy assets without asset_guid
			const allRelatedIds = new Set<string>();
			
			// First, find the root by walking up
			let currentId = payload.assetId;
			for (let i = 0; i < 100; i++) {
				const asset = await db
					.prepare(`SELECT id, parent_asset_id FROM assets WHERE id = ?`)
					.bind(currentId)
					.first();
				if (!asset) break;
				allRelatedIds.add(currentId);
				if (!(asset as any).parent_asset_id) break;
				currentId = (asset as any).parent_asset_id;
			}
			
			// Then, find all descendants from root
			const queue = [currentId];
			while (queue.length > 0) {
				const id = queue.shift()!;
				allRelatedIds.add(id);
				const children = await db
					.prepare(`SELECT id FROM assets WHERE parent_asset_id = ?`)
					.bind(id)
					.all();
				for (const child of children.results) {
					if (!allRelatedIds.has((child as any).id)) {
						queue.push((child as any).id);
					}
				}
			}
			
			const chainCount = allRelatedIds.size;
			
			// Use the larger of the two counts (they should be the same for properly migrated data)
			const totalVersions = Math.max(versionCount, chainCount);

			if (totalVersions <= 1) {
				return Response.json({ error: "Cannot delete the only version of an asset" }, { status: 400 });
			}

			// Find any child versions that reference this one as parent
			const children = await db
				.prepare(`SELECT id FROM assets WHERE parent_asset_id = ?`)
				.bind(payload.assetId)
				.all();

			// Update children to point to this version's parent (preserving the chain)
			if (children.results.length > 0) {
				for (const child of children.results) {
					await db
						.prepare(`UPDATE assets SET parent_asset_id = ? WHERE id = ?`)
						.bind(parentId, (child as any).id)
						.run();
				}
			}

			// Delete the version
			await db
				.prepare(`DELETE FROM assets WHERE id = ?`)
				.bind(payload.assetId)
				.run();

			return Response.json({ success: true, deletedId: payload.assetId });
		}

		return Response.json({ error: "Unknown action" }, { status: 400 });
	}

	return Response.json({ error: "Method not allowed" }, { status: 405 });
}
