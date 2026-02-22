"use client";

import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  MapPin,
  Phone,
  Save,
  Share2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)] p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--admin-accent)]/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="flex-1 font-semibold text-[var(--admin-text)]">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-[var(--admin-text-secondary)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--admin-text-secondary)]" />
        )}
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/50"
      />
    </div>
  );
}

export function VCardDrawer() {
  const utils = trpc.useUtils();
  const vcardQuery = trpc.vcard.get.useQuery();
  const settingsQuery = trpc.settings.getAll.useQuery();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [photo, setPhoto] = useState("");
  const [organization, setOrganization] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [emailWork, setEmailWork] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneWork, setPhoneWork] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [fax, setFax] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [addressWorkStreet, setAddressWorkStreet] = useState("");
  const [addressWorkCity, setAddressWorkCity] = useState("");
  const [addressWorkState, setAddressWorkState] = useState("");
  const [addressWorkZip, setAddressWorkZip] = useState("");
  const [addressWorkCountry, setAddressWorkCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteWork, setWebsiteWork] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialGithub, setSocialGithub] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const card = vcardQuery.data;
    const settingsMap: Record<string, string> = {};
    if (settingsQuery.data) {
      for (const s of settingsQuery.data) {
        settingsMap[s.key] = s.value;
      }
    }

    if (card) {
      setFirstName(card.firstName || "");
      setLastName(card.lastName || "");
      setPrefix(card.prefix || "");
      setSuffix(card.suffix || "");
      setNickname(card.nickname || "");
      setBirthday(card.birthday || "");
      setPhoto(card.photo || settingsMap.profileImage || "");
      setOrganization(card.organization || "");
      setTitle(card.title || "");
      setRole(card.role || "");
      setDepartment(card.department || "");
      setEmail(card.email || "");
      setEmailWork(card.emailWork || "");
      setPhone(card.phone || "");
      setPhoneWork(card.phoneWork || "");
      setPhoneMobile(card.phoneMobile || "");
      setFax(card.fax || "");
      setAddressStreet(card.addressStreet || "");
      setAddressCity(card.addressCity || "");
      setAddressState(card.addressState || "");
      setAddressZip(card.addressZip || "");
      setAddressCountry(card.addressCountry || "");
      setAddressWorkStreet(card.addressWorkStreet || "");
      setAddressWorkCity(card.addressWorkCity || "");
      setAddressWorkState(card.addressWorkState || "");
      setAddressWorkZip(card.addressWorkZip || "");
      setAddressWorkCountry(card.addressWorkCountry || "");
      setWebsite(card.website || "");
      setWebsiteWork(card.websiteWork || "");
      setSocialTwitter(card.socialTwitter || "");
      setSocialLinkedin(card.socialLinkedin || "");
      setSocialGithub(card.socialGithub || "");
      setSocialInstagram(card.socialInstagram || "");
      setSocialFacebook(card.socialFacebook || "");
      setSocialYoutube(card.socialYoutube || "");
      setNotes(card.notes || "");
    } else if (settingsMap.profileName || settingsMap.profileImage) {
      const nameParts = (settingsMap.profileName || "").split(" ");
      if (nameParts.length >= 2) {
        setFirstName(nameParts[0]);
        setLastName(nameParts.slice(1).join(" "));
      } else if (nameParts.length === 1) {
        setFirstName(nameParts[0]);
      }
      setPhoto(settingsMap.profileImage || "");
      setNotes(settingsMap.profileBio || "");
    }
  }, [vcardQuery.data, settingsQuery.data]);

  const updateMutation = trpc.vcard.update.useMutation({
    onSuccess: () => {
      utils.vcard.get.invalidate();
      toast.success("vCard saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    updateMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      prefix: prefix.trim() || undefined,
      suffix: suffix.trim() || undefined,
      nickname: nickname.trim() || undefined,
      birthday: birthday.trim() || undefined,
      photo: photo.trim() || undefined,
      organization: organization.trim() || undefined,
      title: title.trim() || undefined,
      role: role.trim() || undefined,
      department: department.trim() || undefined,
      email: email.trim() || undefined,
      emailWork: emailWork.trim() || undefined,
      phone: phone.trim() || undefined,
      phoneWork: phoneWork.trim() || undefined,
      phoneMobile: phoneMobile.trim() || undefined,
      fax: fax.trim() || undefined,
      addressStreet: addressStreet.trim() || undefined,
      addressCity: addressCity.trim() || undefined,
      addressState: addressState.trim() || undefined,
      addressZip: addressZip.trim() || undefined,
      addressCountry: addressCountry.trim() || undefined,
      addressWorkStreet: addressWorkStreet.trim() || undefined,
      addressWorkCity: addressWorkCity.trim() || undefined,
      addressWorkState: addressWorkState.trim() || undefined,
      addressWorkZip: addressWorkZip.trim() || undefined,
      addressWorkCountry: addressWorkCountry.trim() || undefined,
      website: website.trim() || undefined,
      websiteWork: websiteWork.trim() || undefined,
      socialTwitter: socialTwitter.trim() || undefined,
      socialLinkedin: socialLinkedin.trim() || undefined,
      socialGithub: socialGithub.trim() || undefined,
      socialInstagram: socialInstagram.trim() || undefined,
      socialFacebook: socialFacebook.trim() || undefined,
      socialYoutube: socialYoutube.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  if (vcardQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title="Personal"
        icon={<User className="w-4 h-4 text-[var(--admin-accent)]" />}
        defaultOpen
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="John" required />
          <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Doe" required />
          <Field label="Prefix" value={prefix} onChange={setPrefix} placeholder="Mr." />
          <Field label="Suffix" value={suffix} onChange={setSuffix} placeholder="Jr." />
          <Field label="Nickname" value={nickname} onChange={setNickname} placeholder="Johnny" />
          <Field label="Birthday" value={birthday} onChange={setBirthday} type="date" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Photo URL</label>
          <div className="flex items-center gap-3">
            {photo && (
              <img src={photo} alt="Photo" className="w-10 h-10 rounded-full object-cover border border-[var(--admin-border)]" />
            )}
            <input
              type="url"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/50"
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Professional" icon={<Briefcase className="w-4 h-4 text-[var(--admin-accent)]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Organization" value={organization} onChange={setOrganization} placeholder="Acme Inc." />
          <Field label="Title" value={title} onChange={setTitle} placeholder="Software Engineer" />
          <Field label="Role" value={role} onChange={setRole} placeholder="Developer" />
          <Field label="Department" value={department} onChange={setDepartment} placeholder="Engineering" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Contact" icon={<Phone className="w-4 h-4 text-[var(--admin-accent)]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Personal Email" value={email} onChange={setEmail} type="email" placeholder="john@example.com" />
          <Field label="Work Email" value={emailWork} onChange={setEmailWork} type="email" placeholder="john@company.com" />
          <Field label="Home Phone" value={phone} onChange={setPhone} type="tel" placeholder="+1 (555) 123-4567" />
          <Field label="Work Phone" value={phoneWork} onChange={setPhoneWork} type="tel" placeholder="+1 (555) 765-4321" />
          <Field label="Mobile Phone" value={phoneMobile} onChange={setPhoneMobile} type="tel" placeholder="+1 (555) 000-0000" />
          <Field label="Fax" value={fax} onChange={setFax} type="tel" placeholder="+1 (555) 999-9999" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Addresses" icon={<MapPin className="w-4 h-4 text-[var(--admin-accent)]" />}>
        <h4 className="text-sm font-semibold text-[var(--admin-text-secondary)]">Home Address</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Street" value={addressStreet} onChange={setAddressStreet} placeholder="123 Main St" />
          </div>
          <Field label="City" value={addressCity} onChange={setAddressCity} placeholder="New York" />
          <Field label="State" value={addressState} onChange={setAddressState} placeholder="NY" />
          <Field label="ZIP" value={addressZip} onChange={setAddressZip} placeholder="10001" />
          <Field label="Country" value={addressCountry} onChange={setAddressCountry} placeholder="US" />
        </div>
        <div className="border-t border-[var(--admin-border)] my-4" />
        <h4 className="text-sm font-semibold text-[var(--admin-text-secondary)]">Work Address</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Street" value={addressWorkStreet} onChange={setAddressWorkStreet} placeholder="456 Office Blvd" />
          </div>
          <Field label="City" value={addressWorkCity} onChange={setAddressWorkCity} placeholder="San Francisco" />
          <Field label="State" value={addressWorkState} onChange={setAddressWorkState} placeholder="CA" />
          <Field label="ZIP" value={addressWorkZip} onChange={setAddressWorkZip} placeholder="94102" />
          <Field label="Country" value={addressWorkCountry} onChange={setAddressWorkCountry} placeholder="US" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Online Presence" icon={<Globe className="w-4 h-4 text-[var(--admin-accent)]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Personal Website" value={website} onChange={setWebsite} type="url" placeholder="https://johndoe.com" />
          <Field label="Work Website" value={websiteWork} onChange={setWebsiteWork} type="url" placeholder="https://company.com" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Social Media" icon={<Share2 className="w-4 h-4 text-[var(--admin-accent)]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Twitter / X" value={socialTwitter} onChange={setSocialTwitter} placeholder="https://x.com/username" />
          <Field label="LinkedIn" value={socialLinkedin} onChange={setSocialLinkedin} placeholder="https://linkedin.com/in/username" />
          <Field label="GitHub" value={socialGithub} onChange={setSocialGithub} placeholder="https://github.com/username" />
          <Field label="Instagram" value={socialInstagram} onChange={setSocialInstagram} placeholder="https://instagram.com/username" />
          <Field label="Facebook" value={socialFacebook} onChange={setSocialFacebook} placeholder="https://facebook.com/username" />
          <Field label="YouTube" value={socialYoutube} onChange={setSocialYoutube} placeholder="https://youtube.com/@channel" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Notes" icon={<FileText className="w-4 h-4 text-[var(--admin-accent)]" />}>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for the contact card..."
            rows={4}
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/50 resize-y"
            maxLength={5000}
          />
        </div>
      </CollapsibleSection>

      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Saving..." : "Save vCard"}
        </button>
      </div>
    </div>
  );
}
