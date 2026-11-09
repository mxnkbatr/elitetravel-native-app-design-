import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { AssistantEditor } from "@/app/admin/(panel)/assistant/AssistantEditor";
import { siteModel } from "@/lib/server/ai";
import { getAssistantSettings } from "@/lib/server/assistant-settings";
import { requireAdmin } from "@/lib/server/auth";

export default async function AdminAssistantPage() {
  await requireAdmin("content.manage");
  const settings = await getAssistantSettings();
  return (
    <>
      <AdminTitle
        title="Сайтын чат"
        sub="Сайт болон апп дээрх AI туслахын мэндчилгээ, санал болгох асуултууд, багийн нэмэлт заавар. Хадгалмагц шууд хэрэгжинэ."
      />
      <AssistantEditor initial={settings} modelReady={siteModel() != null} />
    </>
  );
}
