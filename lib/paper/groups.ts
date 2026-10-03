// กลุ่มสอบกระดาษ (ชวนเพื่อนสอบพร้อมกัน) — ชนิดข้อมูล/ข้อความที่หน้าเว็บใช้ร่วมกัน · ตรงกับ backend paperGroup.controller.js

export type AntiCheat = "same" | "variants" | "unique";

/** ใบสอบของรอบปัจจุบัน — printed = สร้าง/พิมพ์แล้วรอสแกน · graded = ตรวจแล้ว */
export type PaperGroupForm = { code: string; variant: string | null; status: "printed" | "graded" };

export type PaperGroupMember = { customer_id: string; name: string; joined_at: string; is_owner: boolean; form: PaperGroupForm | null };

export type PaperGroup = {
    id: string;
    title: string;
    product_id: string;
    prod_name: string;
    owner_name: string;
    member_count: number;
    max_members: number;
    status: "open" | "closed";
    anti_cheat: AntiCheat;
    variants: number;
    /** รอบสอบปัจจุบัน — "เริ่มรอบใหม่" ยกเลิกใบที่ยังไม่ตรวจของรอบก่อน */
    round: number;
    /** จำนวนใบสอบของรอบนี้ (มี = เปลี่ยนแบบกันลอกไม่ได้จนกว่าจะเริ่มรอบใหม่) */
    forms_count?: number;
    created_at: string;
    role: "owner" | "member";
    /** เฉพาะสมาชิก — ใบสอบของตัวเองในรอบนี้ */
    my_form?: PaperGroupForm | null;
    /** เฉพาะผู้จัด */
    code?: string;
    members?: PaperGroupMember[];
    /** เฉพาะสมาชิก */
    joined_at?: string;
    /** ถือสิทธิ์ชุดนี้เองไหม — ไม่มี = สอบได้/เห็นคะแนน แต่เฉลยละเอียดต้องซื้อ */
    has_product?: boolean;
};

export type JoinPreview = {
    id: string;
    title: string;
    prod_name: string;
    owner_name: string;
    member_count: number;
    max_members: number;
    status: "open" | "closed";
    already_member: boolean;
    has_product: boolean;
};

export const ANTI_CHEAT_OPTIONS: { key: AntiCheat; label: string; desc: string }[] = [
    { key: "same", label: "ชุดเดียวกันทั้งกลุ่ม", desc: "ทุกคนได้ลำดับข้อเหมือนกัน พิมพ์ชุดข้อสอบแบบเดียว — ง่ายที่สุด ผู้จัดคุมห้องเอง" },
    { key: "variants", label: "แบ่งเป็นหลายชุด (A/B/C/D)", desc: "เหมือนสนามสอบจริง แจกสลับที่นั่ง คนติดกันได้คนละชุด พิมพ์ชุดข้อสอบแค่ 2-4 แบบ" },
    { key: "unique", label: "สลับไม่ซ้ำทุกคน", desc: "กันลอกได้ดีที่สุด แต่ต้องพิมพ์ชุดข้อสอบแยกทุกคน (มีชื่อกำกับแต่ละเล่ม)" },
];

export function inviteUrl(code: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/exam/paper/join/${code}`;
}

/** ผลสอบของกลุ่ม (เฉพาะผู้จัด) — เรียงตามชื่อ ไม่มีอันดับ · ตรงกับ buildGroupResults ใน backend */
export type GroupMemberResult = {
    score: number;
    /** null = ชุดนี้ไม่ใช้ระบบคะแนน */
    earned: number | null;
    max: number | null;
    correct: number;
    total: number;
    /** null = ชุดนี้ไม่ได้ตั้งเกณฑ์ผ่าน */
    passed: boolean | null;
    failed_subjects: string[];
    graded_at: string;
    /** tpc_id → % ทำถูกของหมวดนั้นในใบนี้ */
    topics: Record<string, number>;
};

export type GroupResults = {
    title: string;
    prod_name: string;
    round: number;
    current_round: number;
    rounds: { round: number; graded: number }[];
    has_criterion: boolean;
    summary: { members: number; with_form: number; graded: number; average_score: number | null; passed: number | null };
    /** ผลรายหมวดของทั้งกลุ่ม หมวดที่อ่อนสุดก่อน */
    topics: { tpc_id: string; tpc_name: string; accuracy: number; members: number }[];
    members: { customer_id: string; name: string; is_owner: boolean; form: PaperGroupForm | null; result: GroupMemberResult | null }[];
};
