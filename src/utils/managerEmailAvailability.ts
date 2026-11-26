import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import type ApiClient from "@/utilities/ApiClient";

export type EmailAvailability = "idle" | "checking" | "available" | "taken" | "invalid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useManagerEmailCheck(api: ApiClient, email: Ref<string>, excludeId?: Ref<string | undefined>) {
  const status = ref<EmailAvailability>("idle");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request = 0;

  async function run(value: string) {
    const current = ++request;
    const trimmed = value.trim();
    if (!trimmed) {
      status.value = "idle";
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      status.value = "invalid";
      return;
    }
    status.value = "checking";
    try {
      const params = new URLSearchParams({ email: trimmed });
      if (excludeId?.value) params.set("excludeId", excludeId.value);
      const response = await api.get<{ data?: { available?: boolean; reason?: string } }>(
        `/user/admin/email-available?${params.toString()}`,
      );
      if (current !== request) return;
      const data = response.data?.data;
      if (data?.reason === "invalid") status.value = "invalid";
      else status.value = data?.available ? "available" : "taken";
    } catch {
      if (current !== request) return;
      status.value = "idle";
    }
  }

  watch(email, (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void run(value);
    }, 400);
  });

  onBeforeUnmount(() => clearTimeout(timer));

  return { status };
}
