import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { StaffManager, type StaffRow } from "@/app/admin/(panel)/staff/StaffManager";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";

export default async function AdminStaffPage() {
  const admin = await requireAdmin("staff.manage");
  const { data } = await db().from("admin_users").select("email, name, role, created_at").order("created_at");

  return (
    <>
      <AdminTitle title="Ажилтнууд" sub="Хэн админ панелд нэвтэрч, юу хийж чадахыг энд тохируулна. Ажилтан бүр өөрийн имэйл, нууц үгээр нэвтэрнэ." />
      <StaffManager staff={(data ?? []) as StaffRow[]} me={admin.email} />
    </>
  );
}
