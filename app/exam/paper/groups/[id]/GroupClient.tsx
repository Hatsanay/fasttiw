"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Camera,
    Check,
    Copy,
    Crown,
    FileText,
    Link2,
    Loader2,
    Lock,
    LogOut,
    Printer,
    RefreshCw,
    RotateCcw,
    ScanLine,
    Share2,
    ShieldCheck,
    Sparkles,
    Trash2,
    Unlock,
    UserMinus,
    Users,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { ANTI_CHEAT_OPTIONS, inviteUrl, type AntiCheat, type PaperGroup, type PaperGroupForm } from "@/lib/paper/groups";
import DownloadButton from "../../DownloadButton";

// หน้ากลุ่มสอบกระดาษ — ผู้จัด: ลิงก์เชิญ/ชุดสอบของรอบ/รายชื่อ/ตั้งค่า · สมาชิก: ข้อมูลกลุ่ม + ใบสอบของตัวเอง
// ทุกการกระทำยิงผ่าน /api/paper-groups (JSON) · PDF ผ่าน /api/paper-group-print (CLAUDE.md ข้อ 6.9.1)

async function call(path: string, method: string, body?: unknown) {
    const res = await fetch(`/api/paper-groups/${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message ?? "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
    return data;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
}

/** ป้ายใบสอบในรายชื่อ — ชุด A-D (ถ้าแบ่งชุด) + ตรวจแล้ว */
function FormBadges({ form }: { form: PaperGroupForm | null | undefined }) {
    if (!form) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">ยังไม่มีชุดสอบ</span>;
    return (
        <>
            {form.variant && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">ชุด {form.variant}</span>}
            {form.status === "graded" ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <Check size={11} />
                    ตรวจแล้ว
                </span>
            ) : (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{form.code}</span>
            )}
        </>
    );
}

const noopSubscribe = () => () => {};

/** ค่าที่มีเฉพาะในเบราว์เซอร์ (origin ของเว็บ, ปุ่มแชร์) — ตอน server render ได้ค่าว่าง ไม่ทำให้ hydration ไม่ตรง */
function useBrowserValue<T>(get: () => T, serverValue: T): T {
    return useSyncExternalStore(noopSubscribe, get, () => serverValue);
}

export default function GroupClient({ initial }: { initial: PaperGroup }) {
    const router = useRouter();
    const [group, setGroup] = useState(initial);
    const [busy, setBusy] = useState<string | null>(null);
    const [title, setTitle] = useState(initial.title);
    const [antiCheat, setAntiCheat] = useState<AntiCheat>(initial.anti_cheat);
    const [variants, setVariants] = useState(initial.variants > 1 ? initial.variants : 2);
    const isOwner = group.role === "owner";

    async function run<T>(key: string, fn: () => Promise<T>, done?: (v: T) => void) {
        setBusy(key);
        try {
            const v = await fn();
            done?.(v);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setBusy(null);
        }
    }

    // รักษารายชื่อ/ใบสอบไว้ — คำตอบของการแก้ไข/ออกรหัสใหม่ไม่ได้ส่งส่วนนี้กลับมา
    const merge = (next: PaperGroup) =>
        setGroup((g) => ({ ...next, members: g.members, has_product: g.has_product, forms_count: g.forms_count, my_form: g.my_form }));
    // งานที่เปลี่ยนใบสอบ/รายชื่อ (สร้างชุดสอบ, เริ่มรอบใหม่, เอาคนออก) โหลดกลุ่มใหม่ทั้งก้อน
    const reload = async () => setGroup(await call(group.id, "GET"));

    const origin = useBrowserValue(() => window.location.origin, "");
    const canShare = useBrowserValue(() => "share" in navigator, false);
    const link = group.code && origin ? inviteUrl(group.code) : "";
    const settingsChanged =
        title.trim() !== group.title || antiCheat !== group.anti_cheat || (antiCheat === "variants" && variants !== group.variants);

    const members = group.members ?? [];
    const formsCount = group.forms_count ?? 0;
    const missing = members.filter((m) => !m.form).length;
    // เปลี่ยนแบบกันลอกได้ต่อเมื่อรอบนี้ยังไม่มีใบสอบ (backend บังคับอีกชั้น)
    const cheatLocked = formsCount > 0;
    const usedVariants = [...new Set(members.map((m) => m.form?.variant).filter((v): v is string => !!v))].sort();
    const printBase = `/api/paper-group-print/${group.id}`;
    const filePrefix = `fasttiw-group-${group.id}-r${group.round}`;

    return (
        <>
            <div className="text-center mb-8">
                <p className="text-sm font-medium text-brand-600 mb-1.5">{group.prod_name}</p>
                <h1 className="text-2xl font-semibold text-slate-900 text-balance">{group.title}</h1>
                <p className="mt-2 text-sm text-slate-500">
                    สอบกระดาษเป็นกลุ่ม · ผู้จัด {group.owner_name} · สมาชิก {group.member_count}/{group.max_members} คน
                    {group.status === "closed" && <span className="text-amber-700"> · ปิดรับสมาชิกแล้ว</span>}
                </p>
            </div>

            {!group.has_product && (
                <Card className="mb-4 border-amber-100 bg-amber-50/50 p-4 text-sm text-amber-800">
                    คุณยังไม่มีสิทธิ์ชุดนี้ — สอบกับกลุ่มได้และเห็นคะแนน ผ่านเกณฑ์ไหม จุดอ่อนรายหมวด แต่<b>เฉลยละเอียดทีละข้อ</b>ต้องซื้อชุดนี้ก่อน{" "}
                    <Link href={`/products/${group.product_id}`} className="font-medium underline">
                        ดูชุดนี้
                    </Link>
                </Card>
            )}

            {isOwner ? (
                <>
                    {/* ชวนเพื่อน */}
                    <Card className="p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <Link2 size={19} />
                            </span>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-800">ชวนเพื่อนเข้ากลุ่ม</p>
                                <p className="text-sm text-slate-500">ส่งลิงก์นี้ให้เพื่อน เพื่อนต้องล็อกอิน/สมัครบัญชี Fasttiw ก่อนกดเข้ากลุ่ม</p>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Input readOnly value={link} aria-label="ลิงก์เชิญ" className="min-w-0 flex-1 text-sm" onFocus={(e) => e.currentTarget.select()} />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("คัดลอกลิงก์แล้ว"), () => toast.error("คัดลอกไม่สำเร็จ"))}
                            >
                                <Copy size={16} />
                                คัดลอก
                            </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {canShare && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => navigator.share({ title: group.title, text: `มาสอบ "${group.prod_name}" ด้วยกัน`, url: link }).catch(() => {})}
                                >
                                    <Share2 size={15} />
                                    แชร์
                                </Button>
                            )}
                            <span className="text-sm text-slate-500">
                                รหัสกลุ่ม <b className="tracking-wide text-slate-700">{group.code}</b>
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="ml-auto"
                                disabled={busy !== null}
                                onClick={() => {
                                    if (!window.confirm("ออกลิงก์ใหม่? ลิงก์เดิมจะใช้ไม่ได้ทันที (คนที่เข้ากลุ่มแล้วยังอยู่ครบ)")) return;
                                    run("code", () => call(`${group.id}/code`, "POST"), (g) => {
                                        merge(g);
                                        toast.success("ออกลิงก์ใหม่แล้ว");
                                    });
                                }}
                            >
                                {busy === "code" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                                ออกลิงก์ใหม่
                            </Button>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={group.status === "open"}
                            disabled={busy !== null}
                            onClick={() => run("status", () => call(group.id, "PUT", { status: group.status === "open" ? "closed" : "open" }), merge)}
                            className="mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-slate-300"
                        >
                            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", group.status === "open" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500")}>
                                {group.status === "open" ? <Unlock size={17} /> : <Lock size={17} />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-slate-800">{group.status === "open" ? "เปิดรับสมาชิกอยู่" : "ปิดรับสมาชิกแล้ว"}</span>
                                <span className="block text-xs text-slate-500">ปิดแล้วลิงก์ยังเปิดดูได้ แต่กดเข้ากลุ่มไม่ได้ — ปิดไว้ตอนคนครบ</span>
                            </span>
                            <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", group.status === "open" ? "bg-brand-600" : "bg-slate-300")}>
                                <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", group.status === "open" ? "translate-x-5.5" : "translate-x-0.5")} />
                            </span>
                        </button>
                    </Card>

                    {/* ชุดสอบของรอบนี้ — ใบสอบรายคน + ไฟล์พิมพ์ */}
                    <Card className="mt-4 p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <Printer size={19} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800">ชุดสอบรอบที่ {group.round}</p>
                                <p className="text-sm text-slate-500">
                                    {ANTI_CHEAT_OPTIONS.find((o) => o.key === group.anti_cheat)?.label}
                                    {group.anti_cheat === "variants" && ` · ${group.variants} ชุด`}
                                    {formsCount > 0 && ` · สร้างแล้ว ${formsCount}/${group.member_count} คน`}
                                </p>
                            </div>
                        </div>

                        {formsCount === 0 ? (
                            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                                ชวนเพื่อนให้ครบก่อนแล้วค่อยกดสร้าง — ทุกคนจะได้ใบสอบของตัวเอง (QR บนกระดาษคำตอบบอกว่าเป็นของใคร ผลตรวจเข้าประวัติของคนนั้น)
                                เลือกแบบกันลอกได้ที่ &quot;ตั้งค่าการสอบ&quot; ด้านล่าง
                            </p>
                        ) : null}

                        {missing > 0 && (
                            <Button
                                type="button"
                                className="mt-4 w-full"
                                disabled={busy !== null}
                                onClick={() =>
                                    run(
                                        "forms",
                                        async () => {
                                            const r = await call(`${group.id}/forms`, "POST");
                                            await reload();
                                            return r as { created: number };
                                        },
                                        (r) => toast.success(`สร้างชุดสอบแล้ว ${r.created} คน`)
                                    )
                                }
                            >
                                {busy === "forms" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {formsCount === 0 ? `สร้างชุดสอบให้ทุกคน (${missing} คน)` : `สร้างเพิ่มให้สมาชิกใหม่ (${missing} คน)`}
                            </Button>
                        )}

                        {formsCount > 0 && (
                            <>
                                <div className="mt-4 rounded-xl border border-slate-100 p-3">
                                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                        <FileText size={15} className="text-brand-600" />
                                        ไฟล์สำหรับพิมพ์
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                        <DownloadButton
                                            primary
                                            href={`${printBase}/answer-sheets`}
                                            fileName={`${filePrefix}-answer-sheets.pdf`}
                                            label={`กระดาษคำตอบทุกคน (${formsCount} ใบ มีชื่อ)`}
                                        />
                                        {group.anti_cheat === "same" && (
                                            <DownloadButton
                                                href={`${printBase}/booklet`}
                                                fileName={`${filePrefix}-questions.pdf`}
                                                label={`ชุดข้อสอบ (พิมพ์ ${formsCount} ชุด)`}
                                            />
                                        )}
                                        {group.anti_cheat === "variants" &&
                                            usedVariants.map((v) => (
                                                <DownloadButton
                                                    key={v}
                                                    href={`${printBase}/booklet?variant=${v}`}
                                                    fileName={`${filePrefix}-questions-set-${v}.pdf`}
                                                    label={`ชุดข้อสอบ ชุด ${v} (${members.filter((m) => m.form?.variant === v).length} คน)`}
                                                />
                                            ))}
                                    </div>
                                    {group.anti_cheat === "unique" && (
                                        <p className="mt-2 text-xs text-slate-500">ชุดข้อสอบสลับไม่ซ้ำกัน — ดาวน์โหลดรายคนได้ที่ปุ่มในรายชื่อด้านล่าง</p>
                                    )}
                                </div>
                                <ul className="mt-3 space-y-1 text-xs leading-relaxed text-slate-500">
                                    <li>• พิมพ์ A4 ขนาดจริง 100% · แจกกระดาษคำตอบตามชื่อที่พิมพ์ไว้ (ใบของใครของคนนั้น)</li>
                                    {group.anti_cheat === "variants" && <li>• แจกชุดข้อสอบให้ตรงกับ &quot;ชุด&quot; ที่พิมพ์บนกระดาษคำตอบของแต่ละคน — นั่งติดกันได้คนละชุด</li>}
                                    {group.anti_cheat === "unique" && <li>• ชุดข้อสอบของแต่ละคนมีชื่อกำกับ แจกให้ตรงกับกระดาษคำตอบชื่อเดียวกัน</li>}
                                </ul>
                                {/* สอบเสร็จแล้ว: ผู้จัดเก็บกระดาษทั้งกองมาสแกนเอง หรือให้แต่ละคนสแกนใบของตัวเองที่หน้ากลุ่มก็ได้ */}
                                <Link
                                    href={`/exam/paper/groups/${group.id}/scan`}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700"
                                >
                                    <ScanLine size={16} />
                                    สแกนกระดาษคำตอบทั้งกอง ({members.filter((m) => m.form?.status === "graded").length}/{formsCount} ตรวจแล้ว)
                                </Link>
                                <p className="mt-1.5 text-center text-xs text-slate-500">หรือให้สมาชิกแต่ละคนถ่ายรูปใบของตัวเองที่หน้ากลุ่ม</p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="mt-3"
                                    disabled={busy !== null}
                                    onClick={() => {
                                        const pending = members.filter((m) => m.form?.status === "printed").length;
                                        const warn = pending ? `กระดาษของรอบนี้ที่ยังไม่ได้ตรวจ ${pending} ใบจะใช้ตรวจไม่ได้อีก (ที่ตรวจแล้วยังอยู่) — ` : "";
                                        if (!window.confirm(`เริ่มรอบสอบใหม่? ${warn}แล้วสร้างชุดสอบของรอบใหม่ได้`)) return;
                                        run(
                                            "round",
                                            async () => {
                                                await call(`${group.id}/round`, "POST");
                                                await reload();
                                            },
                                            () => toast.success("เริ่มรอบใหม่แล้ว")
                                        );
                                    }}
                                >
                                    {busy === "round" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                                    เริ่มรอบสอบใหม่
                                </Button>
                            </>
                        )}
                    </Card>

                    {/* สมาชิก — เรียงตามชื่อ ไม่มีอันดับ (ไม่ทำ leaderboard) */}
                    <Card className="mt-4 p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Users size={18} className="text-brand-600" />
                            <p className="font-medium text-slate-800">
                                สมาชิก {group.member_count}/{group.max_members} คน
                            </p>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {members.map((m) => (
                                <li key={m.customer_id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                            {m.name}
                                            {m.is_owner && (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                                                    <Crown size={11} />
                                                    ผู้จัด
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                            เข้ากลุ่ม {formatDate(m.joined_at)}
                                            {formsCount > 0 && <FormBadges form={m.form} />}
                                        </span>
                                    </span>
                                    {group.anti_cheat === "unique" && m.form && (
                                        <DownloadButton
                                            className="w-auto"
                                            href={`${printBase}/booklet?member=${encodeURIComponent(m.customer_id)}`}
                                            fileName={`${filePrefix}-questions-${m.form.code}.pdf`}
                                            label="ชุดข้อสอบ"
                                        />
                                    )}
                                    {m.is_owner && m.form && group.has_product && (
                                        <Link
                                            href={`/exam/paper/forms/${m.form.code}`}
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                            <Camera size={15} />
                                            ตรวจใบของฉัน
                                        </Link>
                                    )}
                                    {!m.is_owner && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            aria-label={`เอา ${m.name} ออกจากกลุ่ม`}
                                            disabled={busy !== null}
                                            onClick={() => {
                                                const note = m.form?.status === "printed" ? " (กระดาษคำตอบที่พิมพ์ให้เขาแล้วจะใช้ตรวจไม่ได้)" : "";
                                                if (!window.confirm(`เอา ${m.name} ออกจากกลุ่ม?${note}`)) return;
                                                run(`rm-${m.customer_id}`, async () => {
                                                    await call(`${group.id}/members/${m.customer_id}`, "DELETE");
                                                    await reload();
                                                });
                                            }}
                                        >
                                            {busy === `rm-${m.customer_id}` ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                            สมาชิกกดยอมรับแล้วว่าคุณจะเห็นคะแนนของเขาในกลุ่มนี้ · เพื่อนในกลุ่มไม่เห็นรายชื่อและคะแนนของกันและกัน
                        </p>
                    </Card>

                    {/* ตั้งค่าการสอบ */}
                    <Card className="mt-4 p-5">
                        <p className="font-medium text-slate-800">ตั้งค่าการสอบ</p>
                        <label className="mt-3 block text-sm text-slate-600">
                            ชื่อกลุ่ม
                            <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
                        </label>
                        <p className="mt-4 mb-2 text-sm text-slate-600">กันลอกคำตอบ</p>
                        {cheatLocked && (
                            <p className="mb-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                                สร้างชุดสอบของรอบนี้แล้ว — เปลี่ยนแบบกันลอกได้หลังกด &quot;เริ่มรอบสอบใหม่&quot; (กระดาษที่พิมพ์ไปแล้วเป็นแบบเดิม)
                            </p>
                        )}
                        <div className={cn("flex flex-col gap-2", cheatLocked && "pointer-events-none opacity-60")} role="radiogroup" aria-label="กันลอกคำตอบ" aria-disabled={cheatLocked}>
                            {ANTI_CHEAT_OPTIONS.map((o) => (
                                <button
                                    key={o.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={antiCheat === o.key}
                                    disabled={cheatLocked}
                                    onClick={() => setAntiCheat(o.key)}
                                    className={cn(
                                        "rounded-xl border-2 p-3 text-left transition-colors",
                                        antiCheat === o.key ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <span className="block text-sm font-medium text-slate-800">{o.label}</span>
                                    <span className="block text-xs text-slate-500">{o.desc}</span>
                                    {o.key === "variants" && antiCheat === "variants" && (
                                        <span className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            {[2, 3, 4].map((n) => (
                                                <span
                                                    key={n}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-pressed={variants === n}
                                                    onClick={() => setVariants(n)}
                                                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setVariants(n)}
                                                    className={cn(
                                                        "rounded-lg border px-3 py-1 text-sm",
                                                        variants === n ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-700"
                                                    )}
                                                >
                                                    {n} ชุด
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <Button
                            type="button"
                            className="mt-4 w-full"
                            disabled={!settingsChanged || !title.trim() || busy !== null}
                            onClick={() =>
                                run("save", () => call(group.id, "PUT", { title: title.trim(), anti_cheat: antiCheat, variants }), (g) => {
                                    merge(g);
                                    toast.success("บันทึกแล้ว");
                                })
                            }
                        >
                            {busy === "save" && <Loader2 size={16} className="animate-spin" />}
                            บันทึกการตั้งค่า
                        </Button>
                    </Card>

                    <div className="mt-8 text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            disabled={busy !== null}
                            onClick={() => {
                                if (!window.confirm("ลบกลุ่มนี้? สมาชิกทุกคนจะหลุดออกจากกลุ่ม")) return;
                                run("delete", () => call(group.id, "DELETE"), () => {
                                    toast.success("ลบกลุ่มแล้ว");
                                    router.push("/exam/paper/groups");
                                });
                            }}
                        >
                            <Trash2 size={15} />
                            ลบกลุ่ม
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Card className="p-5">
                        <p className="font-medium text-slate-800">คุณอยู่ในกลุ่มนี้แล้ว</p>
                        <p className="mt-1 text-sm text-slate-500">
                            เข้ากลุ่มเมื่อ {group.joined_at ? formatDate(group.joined_at) : "-"} · ผู้จัดจะพิมพ์กระดาษคำตอบที่มีชื่อคุณ แล้วนัดสอบพร้อมกัน
                        </p>
                        <div className="mt-4 rounded-xl border border-slate-100 p-3">
                            {group.my_form ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm text-slate-700">ใบสอบของคุณ รอบที่ {group.round}</span>
                                    <FormBadges form={group.my_form} />
                                    {/* ตรวจใบของตัวเองได้ทุกคน (ผู้จัดก็สแกนให้ได้) — ไม่มีสิทธิ์ชุดนี้ = หน้าผลมีแค่คะแนน/ผ่านไหม/รายหมวด */}
                                    <Link
                                        href={`/exam/paper/forms/${group.my_form.code}`}
                                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <Camera size={15} />
                                        {group.my_form.status === "graded" ? "ดูผล / ตรวจใหม่" : "ถ่ายรูปให้ระบบตรวจ"}
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">ผู้จัดยังไม่ได้สร้างชุดสอบของรอบนี้</p>
                            )}
                        </div>
                        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                            คุณยอมรับแล้วว่าผู้จัดจะเห็นคะแนนของคุณในกลุ่มนี้ · เพื่อนในกลุ่มไม่เห็นคะแนนของคุณ · ออกจากกลุ่มได้ทุกเมื่อ
                        </p>
                    </Card>
                    <div className="mt-8 text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            disabled={busy !== null}
                            onClick={() => {
                                if (!window.confirm("ออกจากกลุ่มนี้?")) return;
                                run("leave", () => call(`${group.id}/members/me`, "DELETE"), () => {
                                    toast.success("ออกจากกลุ่มแล้ว");
                                    router.push("/exam/paper/groups");
                                });
                            }}
                        >
                            <LogOut size={15} />
                            ออกจากกลุ่ม
                        </Button>
                    </div>
                </>
            )}
        </>
    );
}
