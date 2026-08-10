"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AvatarCrop from "@/components/ui/AvatarCrop";
import { uploadAvatarAction, type AvatarState } from "@/app/actions/account";
import { productCoverUrl } from "@/lib/api";

export default function AvatarUpload({ avatarUrl }: { avatarUrl: string | null }) {
    const router = useRouter();
    const [state, dispatch, pending] = useActionState<AvatarState, FormData>(uploadAvatarAction, undefined);

    useEffect(() => {
        if (state?.error) toast.error(state.error);
        if (state?.avatarUrl) {
            toast.success("อัปเดตรูปโปรไฟล์สำเร็จ");
            router.refresh();
        }
    }, [state, router]);

    function handleChange(file: File) {
        const formData = new FormData();
        formData.append("image", file);
        dispatch(formData);
    }

    return <AvatarCrop value={productCoverUrl(avatarUrl) ?? undefined} onChange={handleChange} disabled={pending} />;
}
