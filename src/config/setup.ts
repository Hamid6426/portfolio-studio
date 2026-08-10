import { db } from "@/db/client";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function checkAdminExists(): Promise<boolean> {
    const admin = await db.query.userTable.findFirst({
        where: eq(userTable.role, "admin"),
        columns: {
            id: true,
        },
    });

    return admin !== undefined;
}