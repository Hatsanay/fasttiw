import { LogIn, LogOut, KeyRound, ShieldAlert, UserPlus, Smartphone } from "lucide-react";
import { deviceLabel, thaiDateTime } from "@/lib/device";

// ประวัติการเข้าสู่ระบบของตัวเอง (2026-09-20)
// ถ้ามีคนอื่นเข้าบัญชีได้ เจ้าตัวคือคนที่มีโอกาสเห็นก่อนใคร — แอดมินไม่ได้นั่งไล่ดูทุกบัญชี
// รวมครั้งที่ "เข้าสู่ระบบไม่สำเร็จ" ด้วย เพราะการมีคนพยายามเข้าคือสัญญาณเตือนตัวจริง
export type LoginEvent = {
    id: string;
    action: "login" | "login_failed" | "login_google" | "logout" | "register" | "password_reset" | "device_revoked";
    ip: string | null;
    user_agent: string | null;
    created_at: string;
};

const EVENTS: Record<LoginEvent["action"], { label: string; icon: typeof LogIn; tone: string }> = {
    login: { label: "เข้าสู่ระบบ", icon: LogIn, tone: "bg-brand-50 text-brand-600" },
    login_google: { label: "เข้าสู่ระบบด้วย Google", icon: LogIn, tone: "bg-brand-50 text-brand-600" },
    login_failed: { label: "เข้าสู่ระบบไม่สำเร็จ", icon: ShieldAlert, tone: "bg-red-50 text-red-500" },
    logout: { label: "ออกจากระบบ", icon: LogOut, tone: "bg-slate-100 text-slate-400" },
    register: { label: "สมัครสมาชิก", icon: UserPlus, tone: "bg-brand-50 text-brand-600" },
    password_reset: { label: "ตั้งรหัสผ่านใหม่", icon: KeyRound, tone: "bg-amber-50 text-amber-500" },
    device_revoked: { label: "ตัดอุปกรณ์อื่นออกจากระบบ", icon: Smartphone, tone: "bg-amber-50 text-amber-500" },
};

export default function LoginHistory({ events }: { events: LoginEvent[] }) {
    if (events.length === 0) {
        return <p className="text-sm text-slate-400">ยังไม่มีประวัติในช่วง 90 วันที่ผ่านมา</p>;
    }

    return (
        <div className="flex flex-col gap-2">
            {events.map((e) => {
                const meta = EVENTS[e.action];
                const Icon = meta?.icon ?? LogIn;
                return (
                    <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta?.tone ?? "bg-slate-100 text-slate-400"}`}>
                                <Icon size={14} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm text-slate-700 truncate">{meta?.label ?? e.action}</p>
                                <p className="text-xs text-slate-400 truncate">
                                    {thaiDateTime(e.created_at)} · {deviceLabel(e.user_agent)}
                                </p>
                            </div>
                        </div>
                        {e.ip && <span className="shrink-0 font-mono text-xs text-slate-300">{e.ip}</span>}
                    </div>
                );
            })}
        </div>
    );
}
