import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { ContractEditor } from "@/app/admin/(panel)/contract/ContractEditor";
import { requireAdmin } from "@/lib/server/auth";
import { getContractTemplate } from "@/lib/server/contract";

export default async function AdminContractPage() {
  await requireAdmin("staff.manage");
  const template = await getContractTemplate();
  return (
    <>
      <AdminTitle
        title="Гэрээний загвар"
        sub="Аялагч аппаараа уншиж, гарын үсэг зурах гэрээ. «Нийтлэх» дартал аялагчид харагдахгүй. Гарын үсэг зурсан гэрээ бүр тухайн үеийн текстээрээ хадгалагдана."
      />
      <ContractEditor initial={template} />
    </>
  );
}
