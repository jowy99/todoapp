"use client";

import { FormEvent, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";

type ProfileState = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  isPublic: boolean;
};

type ProfileSettingsProps = {
  email: string;
  initialProfile: ProfileState;
};

export function ProfileSettings({ email, initialProfile }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initials = useMemo(() => {
    const source = profile.displayName.trim() || email;
    const letters = source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "");
    return letters.join("") || "TU";
  }, [email, profile.displayName]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const data = await fetchApi<{ profile: ProfileState }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: profile.displayName.trim(),
          bio: profile.bio.trim(),
          avatarUrl: profile.avatarUrl.trim() || null,
          bannerUrl: profile.bannerUrl.trim() || null,
          isPublic: profile.isPublic,
        }),
      });

      setProfile(data.profile);
      setNotice("Perfil actualizado.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No fue posible guardar el perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="border-border/80 bg-surface/92 overflow-hidden rounded-[1.4rem] border shadow-[0_20px_50px_-34px_rgb(15_23_42/0.85)] backdrop-blur sm:rounded-[1.75rem]">
        <div
          className="h-28 w-full bg-gradient-to-r from-teal-700 via-cyan-600 to-orange-500 sm:h-36"
          style={
            profile.bannerUrl
              ? {
                  backgroundImage: `url(${profile.bannerUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <div className="border-surface flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 bg-slate-200 text-base font-black text-slate-700 shadow-[0_12px_26px_-18px_rgb(15_23_42/0.8)] sm:h-20 sm:w-20 sm:text-lg">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold sm:text-xs ${
                profile.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
              }`}
            >
              {profile.isPublic ? "Perfil público" : "Perfil privado"}
            </span>
          </div>
          <p className="text-primary-strong mt-3 text-xs font-semibold tracking-[0.12em] uppercase">
            Perfil
          </p>
          <h1 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
            {profile.displayName.trim() || "Sin nombre visible"}
          </h1>
          <p className="text-muted text-sm">{email}</p>
          <p className="text-muted mt-2 text-sm">
            {profile.bio.trim() || "Agrega una bio corta para describirte en tu perfil."}
          </p>
        </div>
      </header>

      {error ? (
        <p className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm font-medium">{error}</p>
      ) : null}
      {notice ? (
        <p className="bg-success/10 text-success rounded-xl px-4 py-3 text-sm font-medium">
          {notice}
        </p>
      ) : null}

      <form
        onSubmit={handleSave}
        className="border-border/80 bg-surface/90 space-y-4 rounded-2xl border p-4 shadow-[0_16px_32px_-24px_rgb(15_23_42/0.75)] sm:p-5"
      >
        <h2 className="text-lg font-bold">Editar perfil</h2>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Nombre visible</span>
          <input
            value={profile.displayName}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, displayName: event.target.value }))
            }
            className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
            placeholder="Tu nombre"
            maxLength={60}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            value={profile.bio}
            onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
            className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
            rows={4}
            maxLength={280}
            placeholder="Cuéntanos algo de ti"
          />
          <span className="text-muted text-xs">{profile.bio.length}/280</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">URL de avatar</span>
          <input
            type="url"
            value={profile.avatarUrl}
            onChange={(event) => setProfile((prev) => ({ ...prev, avatarUrl: event.target.value }))}
            className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
            placeholder="https://..."
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">URL de banner</span>
          <input
            type="url"
            value={profile.bannerUrl}
            onChange={(event) => setProfile((prev) => ({ ...prev, bannerUrl: event.target.value }))}
            className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
            placeholder="https://..."
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={profile.isPublic}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, isPublic: event.target.checked }))
            }
            className="accent-primary h-4 w-4"
          />
          Hacer perfil público
        </label>
        <div>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-strong hover:bg-primary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 sm:w-auto"
          >
            {isSaving ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
      </form>
    </section>
  );
}
