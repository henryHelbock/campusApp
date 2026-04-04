import { getDatabase, closeDatabase } from "./database";
import fs from "fs";
import path from "path";

function seed(): void {
	const db = getDatabase();

	console.log("Reading schema from SQL file...");

	try {
		const schemaPath = path.join(
			__dirname,
			"migrations",
			"001-initial-schema.sql",
		);
		const schemaSql = fs.readFileSync(schemaPath, "utf-8");

		db.exec(schemaSql);
		console.log("Tables built successfully from the migrations file!");
	} catch (error) {
		console.error(
			"Failed to read the SQL file. Check the path and filename!",
			error,
		);
		return;
	}

	console.log("Sweeping out old data and resetting IDs...");

	db.exec(`
        DELETE FROM audit_logs;
        DELETE FROM item_images;
        DELETE FROM lost_found_items;
        DELETE FROM issues;
        DELETE FROM users;
        
        DELETE FROM sqlite_sequence; 
    `);

	console.log("Injecting flagged seed data...");

	// Create a test admin user (password: "admin123" — NOT for production)
	const adminHash = "$2b$10$placeholder_hash_for_dev_only";
	db.prepare(
		`
        INSERT INTO users (email, password_hash, role, status)
        VALUES (?, ?, 'admin', 'active')
    `,
	).run("admin@oneonta.edu", adminHash);

	const studentHash = "$2b$10$placeholder_hash_for_dev_only";
	const studentResult = db
		.prepare(
			`
        INSERT INTO users (email, password_hash, role, status)
        VALUES (?, ?, 'student', 'active')
    `,
		)
		.run("student@oneonta.edu", studentHash);

	const studentId = studentResult.lastInsertRowid;

	const sampleIssues = [
		{
			category: "Road",
			severity: "Medium",
			description: "Icy walkway near Milne Library",
			lat: 42.454,
			lng: -75.0635,
			reportCount: 5,
		},
		{
			category: "Water",
			severity: "Mild",
			description: "Drinking fountain not working in IRC",
			lat: 42.4528,
			lng: -75.0645,
			reportCount: 3,
		},
		{
			category: "Building",
			severity: "Large",
			description: "Heating issue in Fitzelle Hall",
			lat: 42.4537,
			lng: -75.0655,
			reportCount: 12,
		},
	];

	const insertIssue = db.prepare(`
        INSERT INTO issues (category, severity, description, latitude, longitude, reporter_id, report_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

	for (const issue of sampleIssues) {
		insertIssue.run(
			issue.category,
			issue.severity,
			issue.description,
			issue.lat,
			issue.lng,
			studentId,
			issue.reportCount,
		);
	}

	db.prepare(
		`
        INSERT INTO lost_found_items (type, title, description, category, latitude, longitude, reporter_id)
        VALUES ('lost', 'Black AirPods Case', 'Lost near Milne Library entrance', 'Electronics', 42.4541, -75.0633, ?)
    `,
	).run(studentId);

	console.log("Seed data inserted successfully.");
	closeDatabase();
}

seed();
