// type ของแบบทดสอบวัดระดับฟรี — แยกจาก lib/diagnostic.ts (server-only) ให้ client component import ได้

export type DiagnosticCategory = { cat_id: string; cat_name: string; question_count: number; topic_count: number };

export type DiagnosticChoice = { cho_id: string; cho_text: string; cho_image_url: string | null };

// ตอนทำ: ไม่มีเฉลย (reveal = null) · ตอนตรวจแล้ว: มีเฉลยเต็ม + คำตอบที่เลือก
export type DiagnosticQuestion = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    choices: DiagnosticChoice[];
    tpc_name: string | null;
};

export type GradedQuestion = DiagnosticQuestion & {
    selected_choice_id: string | null;
    is_correct: boolean;
    reveal: {
        correct_choice_id: string | null;
        explanation: string | null;
        choice_reasons: { cho_id: string; is_correct: boolean; wrong_reason: string | null }[];
    };
};

export type DiagnosticTopic = { tpc_id: string | null; tpc_name: string; correct: number; total: number; pct: number };

export type DiagnosticRecommendation = {
    prod_id: string;
    prod_name: string;
    prod_price: string;
    prod_compare_price: string | null;
    prod_is_free: boolean;
    prod_cover_url: string | null;
    question_count: number;
    weak_topic_counts: { tpc_id: string; tpc_name: string; count: number }[];
};

export type DiagnosticResult = {
    category: { cat_id: string; cat_name: string };
    summary: { correct: number; answered: number; total: number; pct: number; weak_below_pct: number };
    topics: DiagnosticTopic[];
    weak_topics: { tpc_id: string; tpc_name: string }[];
    recommendations: DiagnosticRecommendation[];
    questions: GradedQuestion[];
};
