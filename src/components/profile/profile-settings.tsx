"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { useT } from "@/components/settings/locale-provider";
import { useAppToast } from "@/components/ui/toaster-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const MAX_LOCAL_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
const MAX_LOCAL_IMAGE_DATA_URL_LENGTH = 700_000;

function readFileAsDataUrl(file: File, readErrorMessage: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(readErrorMessage));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error(readErrorMessage));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string, loadErrorMessage: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(loadErrorMessage));
    image.src = dataUrl;
  });
}

async function optimizeLocalImage(
  file: File,
  options: {
    maxWidth: number;
    maxHeight: number;
    quality?: number;
  },
  messages: {
    invalidImage: string;
    fileTooLarge: string;
    readFileError: string;
    loadImageError: string;
    processImageError: string;
    outputTooLarge: string;
  },
) {
  if (!file.type.startsWith("image/")) {
    throw new Error(messages.invalidImage);
  }

  if (file.size > MAX_LOCAL_IMAGE_FILE_BYTES) {
    throw new Error(messages.fileTooLarge);
  }

  const sourceDataUrl = await readFileAsDataUrl(file, messages.readFileError);
  const image = await loadImage(sourceDataUrl, messages.loadImageError);
  const scale = Math.min(
    1,
    options.maxWidth / Math.max(1, image.naturalWidth),
    options.maxHeight / Math.max(1, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(messages.processImageError);
  }

  context.drawImage(image, 0, 0, width, height);
  let output = canvas.toDataURL("image/webp", options.quality ?? 0.82);

  if (!output.startsWith("data:image/")) {
    output = canvas.toDataURL("image/png");
  }

  if (output.length > MAX_LOCAL_IMAGE_DATA_URL_LENGTH) {
    throw new Error(messages.outputTooLarge);
  }

  return output;
}

export function ProfileSettings({ email, initialProfile }: ProfileSettingsProps) {
  const t = useT();
  const { pushToast } = useAppToast();
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [processingImageField, setProcessingImageField] = useState<"avatar" | "banner" | null>(null);

  const initials = useMemo(() => {
    const source = profile.displayName.trim() || email;
    const letters = source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "");
    return letters.join("") || "TU";
  }, [email, profile.displayName]);

  async function applyLocalImage(
    file: File,
    field: "avatarUrl" | "bannerUrl",
    options: {
      maxWidth: number;
      maxHeight: number;
      quality?: number;
    },
    messages: {
      invalidImage: string;
      fileTooLarge: string;
      readFileError: string;
      loadImageError: string;
      processImageError: string;
      outputTooLarge: string;
    },
  ) {
    setProcessingImageField(field === "avatarUrl" ? "avatar" : "banner");

    try {
      const optimizedImage = await optimizeLocalImage(file, options, messages);
      setProfile((prev) => ({
        ...prev,
        [field]: optimizedImage,
      }));
      pushToast({
        variant: "success",
        message:
          field === "avatarUrl"
            ? t("profileSettings.noticeAvatarUploaded")
            : t("profileSettings.noticeBannerUploaded"),
      });
    } catch (uploadError) {
      pushToast({
        variant: "error",
        message: uploadError instanceof Error ? uploadError.message : t("profileSettings.errorUpload"),
      });
    } finally {
      setProcessingImageField(null);
    }
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await applyLocalImage(file, "avatarUrl", {
      maxWidth: 720,
      maxHeight: 720,
      quality: 0.82,
    }, {
      invalidImage: t("profileSettings.errorInvalidImage"),
      fileTooLarge: t("profileSettings.errorFileTooLarge"),
      readFileError: t("profileSettings.errorReadFile"),
      loadImageError: t("profileSettings.errorLoadImage"),
      processImageError: t("profileSettings.errorProcessImage"),
      outputTooLarge: t("profileSettings.errorOutputTooLarge"),
    });
    event.target.value = "";
  }

  async function handleBannerFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await applyLocalImage(file, "bannerUrl", {
      maxWidth: 1920,
      maxHeight: 720,
      quality: 0.8,
    }, {
      invalidImage: t("profileSettings.errorInvalidImage"),
      fileTooLarge: t("profileSettings.errorFileTooLarge"),
      readFileError: t("profileSettings.errorReadFile"),
      loadImageError: t("profileSettings.errorLoadImage"),
      processImageError: t("profileSettings.errorProcessImage"),
      outputTooLarge: t("profileSettings.errorOutputTooLarge"),
    });
    event.target.value = "";
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      pushToast({
        variant: "success",
        message: t("profileSettings.noticeSaved"),
      });
    } catch (saveError) {
      pushToast({
        variant: "error",
        message: saveError instanceof Error ? saveError.message : t("profileSettings.errorSave"),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-5 sm:space-y-6">
      <header className="ui-card ui-card--hero overflow-hidden">
        <div
          className="h-28 w-full bg-gradient-to-r from-[color:var(--primary-700)] via-[color:var(--primary)] to-[color:var(--accent)] sm:h-36"
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
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-[color:var(--ui-surface-1)] bg-[color:var(--ui-surface-2)] text-base font-black text-[color:var(--ui-text-muted)] shadow-[var(--ui-shadow-sm)] sm:h-20 sm:w-20 sm:text-lg">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={t("profileSettings.avatarAlt")} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold sm:text-xs ${
                profile.isPublic
                  ? "bg-[color:color-mix(in_srgb,var(--success)_16%,var(--ui-surface-1))] text-[color:color-mix(in_srgb,var(--success)_84%,var(--ui-text-strong))]"
                  : "bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)]"
              }`}
            >
              {profile.isPublic ? t("profileSettings.public") : t("profileSettings.private")}
            </span>
          </div>
          <p className="text-primary-strong mt-3 text-xs font-semibold tracking-[0.12em] uppercase">{t("profileSettings.headerKicker")}</p>
          <h1 className="ui-title-lg mt-3 sm:text-2xl">{profile.displayName.trim() || t("profileSettings.headerEmptyName")}</h1>
          <p className="ui-subtle">{email}</p>
          <p className="ui-subtle mt-2">
            {profile.bio.trim() || t("profileSettings.defaultBio")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="ui-chip bg-primary/10 text-primary-strong font-semibold">{t("profileSettings.localAccount")}</span>
            <span className="ui-chip bg-accent/10 text-[color:var(--ui-text-strong)] font-semibold">
              {profile.isPublic ? t("profileSettings.visiblePublic") : t("profileSettings.visiblePrivate")}
            </span>
          </div>
        </div>
      </header>
      <form onSubmit={handleSave} className="ui-card space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">{t("profileSettings.sectionKicker")}</p>
            <h2 className="ui-title-lg mt-1">{t("profileSettings.sectionTitle")}</h2>
          </div>
          <span
            className={`ui-chip ui-chip--meta ${
              profile.isPublic
                ? "bg-[color:color-mix(in_srgb,var(--success)_16%,var(--ui-surface-1))] text-[color:color-mix(in_srgb,var(--success)_84%,var(--ui-text-strong))]"
                : "bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)]"
            }`}
          >
            {profile.isPublic ? t("profileSettings.sectionPublic") : t("profileSettings.sectionPrivate")}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("profileSettings.displayName")}</span>
            <Input
              value={profile.displayName}
              onChange={(event) => setProfile((prev) => ({ ...prev, displayName: event.target.value }))}
              className="ui-field w-full"
              placeholder={t("profileSettings.displayNamePlaceholder")}
              maxLength={60}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("profileSettings.avatarUrl")}</span>
            <Input
              type="text"
              value={profile.avatarUrl}
              onChange={(event) => setProfile((prev) => ({ ...prev, avatarUrl: event.target.value }))}
              className="ui-field w-full"
              placeholder={t("profileSettings.urlPlaceholder")}
              autoComplete="url"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="ui-btn ui-btn--secondary min-h-10 cursor-pointer px-3 text-xs font-semibold sm:text-sm">
                {processingImageField === "avatar"
                  ? t("profileSettings.uploadProcessing")
                  : t("profileSettings.uploadAvatar")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleAvatarFileChange(event)}
                  className="sr-only"
                  disabled={processingImageField !== null}
                />
              </label>
              <button
                type="button"
                onClick={() => setProfile((prev) => ({ ...prev, avatarUrl: "" }))}
                className="ui-btn ui-btn--ghost min-h-10 px-3 text-xs font-semibold sm:text-sm"
              >
                {t("profileSettings.removeAvatar")}
              </button>
            </div>
            <p className="text-muted text-xs">{t("profileSettings.externalUrlHint")}</p>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("profileSettings.bio")}</span>
          <Textarea
            value={profile.bio}
            onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
            className="ui-field w-full"
            rows={4}
            maxLength={280}
            placeholder={t("profileSettings.bioPlaceholder")}
          />
          <span className="text-muted text-xs">{profile.bio.length}/280</span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("profileSettings.bannerUrl")}</span>
          <Input
            type="text"
            value={profile.bannerUrl}
            onChange={(event) => setProfile((prev) => ({ ...prev, bannerUrl: event.target.value }))}
            className="ui-field w-full"
            placeholder={t("profileSettings.urlPlaceholder")}
            autoComplete="url"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="ui-btn ui-btn--secondary min-h-10 cursor-pointer px-3 text-xs font-semibold sm:text-sm">
              {processingImageField === "banner"
                ? t("profileSettings.uploadProcessing")
                : t("profileSettings.uploadBanner")}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void handleBannerFileChange(event)}
                className="sr-only"
                disabled={processingImageField !== null}
              />
            </label>
            <button
              type="button"
              onClick={() => setProfile((prev) => ({ ...prev, bannerUrl: "" }))}
              className="ui-btn ui-btn--ghost min-h-10 px-3 text-xs font-semibold sm:text-sm"
            >
              {t("profileSettings.removeBanner")}
            </button>
          </div>
          <p className="text-muted text-xs">{t("profileSettings.externalUrlHint")}</p>
        </label>

        <label className="border-border bg-surface/75 inline-flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={profile.isPublic}
            onChange={(event) => setProfile((prev) => ({ ...prev, isPublic: event.target.checked }))}
            className="accent-primary h-4 w-4"
          />
          {t("profileSettings.publicToggle")}
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-xs">{t("profileSettings.saveHint")}</p>
          <button type="submit" disabled={isSaving} className="ui-btn ui-btn--primary w-full sm:w-auto">
            {isSaving ? t("profileSettings.saving") : t("profileSettings.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
