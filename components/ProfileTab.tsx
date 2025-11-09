"use client";
import { useEffect, useRef, useState } from "react";

export function ProfileTab() {
  const [me, setMe] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/me", { cache: "no-store" }).then(r => r.json());
    if (r.ok) {
      setMe(r.me);
      setNickname(r.me?.nickname ?? "");
      setPreview(r.me?.image ?? null);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function save() {
    let imageBase64: string | undefined;
    const f = fileRef.current?.files?.[0];
    if (f) {
      const b64 = await fileToBase64(f, 128); // 가볍게 리사이즈/압축
      imageBase64 = b64;
    }
    const r = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, imageBase64 })
    }).then(r => r.json());
    if (r.ok) refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <img src={preview ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${me?.id ?? 'me'}`} alt="avatar"
             className="w-16 h-16 rounded-2xl border" />
        <div className="flex-1">
          <input className="input" placeholder="닉네임" value={nickname}
            onChange={e => setNickname(e.target.value)} />
          <div className="text-sm opacity-60 mt-1">사진은 100KB 이하로 자동 압축 저장</div>
        </div>
        <input type="file" ref={fileRef} accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          setPreview(url);
        }}/>
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={save}>저장</button>
      </div>
    </div>
  );
}

function fileToBase64(file: File, maxSize: number): Promise<string> {
  // 간단 resize(긴변 128px) & JPEG 압축
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
