"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  ExternalLink,
  FileCode2,
  FolderKanban,
  GitBranch,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu,
  Plus,
  Rocket,
  ShieldAlert,
  TerminalSquare,
  X,
} from "lucide-react";
import {
  architectureStages,
  DEMO_LABEL,
  demoDeployments,
  demoLog,
  demoProjects,
  demoTargets,
} from "../../lib/studio-demo";
import styles from "./StudioShell.module.css";
const nav = [
  { href: "/studio", label: "ภาพรวม", icon: Layers3 },
  { href: "/studio/projects", label: "โปรเจกต์", icon: FolderKanban },
  {
    href: "/studio/terminals",
    label: "ปลายทางและความปลอดภัย",
    icon: TerminalSquare,
  },
  { href: "/studio/deployments", label: "ประวัติการเผยแพร่", icon: Rocket },
  { href: "/studio/settings", label: "การตั้งค่า", icon: KeyRound },
];
const pages: Record<
  string,
  { eyebrow: string; title: string; subtitle: string }
> = {
  "/studio": {
    eyebrow: "WORKBENCH · OVERVIEW",
    title: "เตรียม build อย่างมั่นใจ",
    subtitle:
      "ภาพรวมแนวทางจาก source ไปสู่ isolated build และ deploy target — ตอนนี้เป็น prototype เท่านั้น",
  },
  "/studio/projects": {
    eyebrow: "พื้นที่โปรเจกต์ต้นทาง",
    title: "โปรเจกต์",
    subtitle:
      "รายการโปรเจกต์สำหรับเตรียม source, build configuration และปลายทางในอนาคต",
  },
  "/studio/projects/new": {
    eyebrow: "ตั้งค่าโปรเจกต์",
    title: "สร้างโปรเจกต์",
    subtitle:
      "ร่างการตั้งค่าใน browser นี้เพื่อดูขั้นตอนเท่านั้น ยังไม่มีการเชื่อม repository หรือบันทึกไปยัง server",
  },
  "/studio/terminals": {
    eyebrow: "สภาพแวดล้อม build",
    title: "ปลายทางและความปลอดภัย",
    subtitle:
      "วางแผน adapter และขอบเขตความปลอดภัยก่อนเปิดใช้ build runner จริง",
  },
  "/studio/deployments": {
    eyebrow: "กิจกรรมการเผยแพร่",
    title: "ประวัติการเผยแพร่",
    subtitle:
      "ตัวอย่างรูปแบบ timeline และ log viewer — ไม่มี deployment จริงหรือสถานะ live",
  },
  "/studio/settings": {
    eyebrow: "การตั้งค่า workspace",
    title: "การตั้งค่าและ integrations",
    subtitle:
      "ดูแผนการเชื่อมต่อในอนาคต โดยไม่รับหรือเก็บ credentials จริงใน browser",
  },
};
function Pill({
  children,
  red = false,
}: {
  children: React.ReactNode;
  red?: boolean;
}) {
  return (
    <span className={`${styles.pill} ${red ? styles.pillRed : ""}`}>
      {children}
    </span>
  );
}
function SectionHead({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <div className={styles.kicker}>{kicker}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function DemoMark() {
  return (
    <span className={styles.demoMark}>
      <span /> {DEMO_LABEL}
    </span>
  );
}
export default function StudioShell() {
  const path = usePathname() || "/studio";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [framework, setFramework] = useState("Next.js");
  const [target, setTarget] = useState("");
  const [targetError, setTargetError] = useState("");
  const [step, setStep] = useState(1);
  const [created, setCreated] = useState(false);
  const [notice, setNotice] = useState("");
  const [isMobileNavigation, setIsMobileNavigation] = useState(false);
  const goForward = () => {
    if (step === 1 && !name.trim()) {
      setNameError("กรุณาระบุชื่อโปรเจกต์ก่อนดำเนินการต่อ");
      document.getElementById("projectName")?.focus();
      return;
    }
    if (step === 2 && !target) {
      setTargetError("เลือก deployment target สำหรับ draft ก่อนดำเนินการต่อ");
      document.getElementById("target-option-vercel")?.focus();
      return;
    }
    setNameError("");
    setTargetError("");
    setStep(step + 1);
  };
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobileNavigation(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!isMobileNavigation || !menuOpen) return;
    document.querySelector<HTMLAnchorElement>("#studio-navigation a")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      window.requestAnimationFrame(() =>
        document.getElementById("studio-mobile-menu-trigger")?.focus()
      );
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavigation, menuOpen]);
  const page = path.startsWith("/studio/deployments/")
    ? {
        eyebrow: "รายละเอียด deployment · ตัวอย่าง",
        title: "รายละเอียด deployment",
        subtitle:
          "ข้อมูลรายละเอียดและ log เป็น fixture สำหรับ preview เท่านั้น ไม่ใช่ผล build หรือ deployment จริง",
      }
    : pages[path] || pages["/studio"];
  const activeNav = path.startsWith("/studio/projects")
    ? "/studio/projects"
    : path.startsWith("/studio/deployments")
      ? "/studio/deployments"
      : path;
  const deploymentId = path.split("/").pop() || "";
  const selectedDeployment = demoDeployments.find(
    deployment => deployment.id === deploymentId
  );
  const action = (label: string) => {
    setNotice(
      `${label}: ยังไม่พร้อมใช้งาน · prototype นี้ไม่มีการเชื่อม server, terminal หรือ deployment`
    );
    window.setTimeout(() => setNotice(""), 4800);
  };
  const button = (
    label: string,
    fn: () => void,
    kind = "secondary",
    icon?: React.ReactNode
  ) => (
    <Button
      className={`${styles.button} ${kind === "primary" ? styles.primary : ""}`}
      onClick={fn}
    >
      {icon}
      {label}
    </Button>
  );
  const closeMenu = () => {
    setMenuOpen(false);
    if (isMobileNavigation) {
      window.requestAnimationFrame(() =>
        document.getElementById("studio-mobile-menu-trigger")?.focus()
      );
    }
  };
  return (
    <div className={styles.frame}>
      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
        aria-label="เมนู Studio"
        aria-hidden={isMobileNavigation && !menuOpen}
        inert={isMobileNavigation && !menuOpen}
      >
        <Link href="/studio" className={styles.brand}>
          <span className={styles.brandMark}>
            a<span>.</span>
          </span>
          <span>
            ai-sdk.pro<small>เครื่องมือสร้างเว็บไซต์</small>
          </span>
        </Link>
        <div className={styles.workspaceTag}>
          <span className={styles.pulse} /> WORKSPACE · ต้นแบบ
        </div>
        <nav
          id="studio-navigation"
          className={styles.nav}
          aria-label="เมนู Studio"
        >
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              aria-current={activeNav === href ? "page" : undefined}
              className={`${styles.navLink} ${activeNav === href ? styles.navActive : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activeNav === href && (
                <ChevronRight size={15} className={styles.navChevron} />
              )}
            </Link>
          ))}
        </nav>
        <div className={styles.sideBottom}>
          <div className={styles.sideNote}>
            <ShieldAlert size={16} />
            <span>
              <b>ปลอดภัยไว้ก่อน</b>
              <br />
              Build code ที่ไม่เชื่อถือ ต้องรันแยกจาก control plane และ secrets
            </span>
          </div>
          <div className={styles.sideVersion}>
            Studio UI <span>·</span> ตัวอย่างเท่านั้น
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          aria-label="ปิดเมนู"
          className={styles.scrim}
          onClick={closeMenu}
        />
      )}
      <main
        className={styles.main}
        aria-hidden={isMobileNavigation && menuOpen}
        inert={isMobileNavigation && menuOpen}
      >
        <header className={styles.topbar}>
          <Button
            className={styles.mobileMenu}
            id="studio-mobile-menu-trigger"
            aria-label={menuOpen ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
            aria-controls="studio-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </Button>
          <div className={styles.breadcrumb}>
            ai-sdk.pro <ChevronRight size={14} /> Studio{" "}
            <ChevronRight size={14} />
            <b>{page.title}</b>
          </div>
          <span className={styles.topContext}>
            <span /> สภาพแวดล้อมตัวอย่าง
          </span>
        </header>
        <div className={styles.content}>
          <div className={styles.pageHead}>
            <div>
              <div className={styles.kicker}>{page.eyebrow}</div>
              <h1>{page.title}</h1>
              <p>{page.subtitle}</p>
            </div>
            {path === "/studio/projects" &&
              button(
                "สร้างโปรเจกต์",
                () => router.push("/studio/projects/new"),
                "primary",
                <Plus size={16} />
              )}
            {path === "/studio" &&
              button(
                "เริ่มโปรเจกต์",
                () => router.push("/studio/projects/new"),
                "primary",
                <Plus size={16} />
              )}
          </div>
          <div className={styles.prototypeNotice} role="note">
            <span className={styles.noticeIcon}>
              <ShieldAlert size={17} />
            </span>
            <div>
              <b>
                UI prototype เท่านั้น — ไม่ได้เชื่อม server, terminal หรือ
                deployment
              </b>
              <span>
                ปุ่มและข้อมูลตัวอย่างไม่ทำงานกับระบบจริง · ไม่แสดงผล deploy หรือ
                metrics สด
              </span>
            </div>
            <Pill red>ตัวอย่างเท่านั้น</Pill>
          </div>
          {path === "/studio" && (
            <>
              <section className={styles.hero}>
                <div className={styles.heroCopy}>
                  <div className={styles.heroEyebrow}>
                    <span className={styles.heroDot} /> SERVER-SIDE WORKBENCH ·
                    BUILD และ deploy เว็บไซต์
                  </div>
                  <h2>
                    จาก source code
                    <br />
                    สู่ release ที่ <em>ควบคุมได้</em>
                  </h2>
                  <p>
                    เตรียม workflow สำหรับ build บน server ที่แยกขอบเขต พร้อม
                    target ที่เลือกได้ — เชื่อมต่อจริงยังอยู่ในแผน
                  </p>
                  <div className={styles.heroActions}>
                    {button(
                      "สำรวจโปรเจกต์",
                      () => router.push("/studio/projects"),
                      "primary",
                      <FolderKanban size={16} />
                    )}
                    <Link className={styles.textLink} href="/studio/terminals">
                      ดูแนวทางความปลอดภัย <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
                <div className={styles.heroArt} aria-hidden="true">
                  <div className={`${styles.orbit} ${styles.orbitOne}`} />
                  <div className={`${styles.orbit} ${styles.orbitTwo}`} />
                  <div className={styles.orbitCore}>
                    <Code2 size={30} />
                  </div>
                  <span className={styles.orbitTag}>SOURCE · ต้นทาง</span>
                  <span className={styles.orbitTag2}>BUILD แบบแยกส่วน</span>
                  <span className={styles.orbitTag3}>TARGET · ปลายทาง</span>
                  <div className={styles.orbitLine} />
                </div>
                <div className={styles.heroFoot}>
                  <span>สถานะแนวคิด</span>
                  <b>
                    <i /> ยังไม่เชื่อมต่อ
                  </b>
                  <span>Runner ยังไม่เชื่อมต่อ</span>
                </div>
              </section>
              <SectionHead
                kicker="ภาพรวม pipeline"
                title="สี่ช่วง จากโค้ดถึงการปล่อยงาน"
              >
                <Link href="/studio/terminals" className={styles.inlineLink}>
                  รายละเอียดสถาปัตยกรรม <ArrowRight size={15} />
                </Link>
              </SectionHead>
              <div className={styles.stageGrid}>
                {architectureStages.map((s, i) => (
                  <article className={styles.stageCard} key={s.title}>
                    <div className={styles.stageTop}>
                      <span>0{i + 1}</span>
                      {i < 3 && <ArrowRight size={15} />}
                    </div>
                    <h3>{s.title.slice(5)}</h3>
                    <p>{s.text}</p>
                    <Pill>{i === 0 ? "ต้นทาง" : "วางแผนไว้"}</Pill>
                  </article>
                ))}
              </div>
              <div className={styles.twoCol}>
                <section className={styles.panel}>
                  <SectionHead
                    kicker="โปรเจกต์ต้นทาง"
                    title="โปรเจกต์ที่กำลังเตรียม"
                  >
                    <Link className={styles.inlineLink} href="/studio/projects">
                      ทั้งหมด <ArrowRight size={14} />
                    </Link>
                  </SectionHead>
                  <div className={styles.projectList}>
                    {demoProjects.slice(0, 2).map(p => (
                      <Link
                        href="/studio/projects"
                        className={styles.projectRow}
                        key={p.id}
                      >
                        <span className={styles.projectIcon}>
                          <Code2 size={17} />
                        </span>
                        <span className={styles.projectInfo}>
                          <b>{p.name}</b>
                          <small>
                            {p.framework} <i /> {p.branch}
                          </small>
                        </span>
                        <Pill>{p.stage}</Pill>
                        <ChevronRight size={16} />
                      </Link>
                    ))}
                  </div>
                  <DemoMark />
                </section>
                <section className={styles.panel}>
                  <SectionHead kicker="NEXT STEP" title="เตรียมสภาพแวดล้อม" />
                  <p className={styles.panelIntro}>
                    ก่อน build จริง ควรยืนยันแหล่ง source, แยก build runner
                    และกำหนด target ที่ได้รับอนุญาต
                  </p>
                  <div className={styles.checkItem}>
                    <span>
                      <Check size={14} />
                    </span>
                    <div>
                      <b>แยก untrusted code จาก control plane</b>
                      <small>
                        ห้ามส่งต่อ DB, GitHub หรือ deploy credentials ให้ build
                        process
                      </small>
                    </div>
                  </div>
                  <div className={styles.checkItem}>
                    <span>
                      <ArrowRight size={14} />
                    </span>
                    <div>
                      <b>เลือก target เมื่อ integration พร้อม</b>
                      <small>
                        Vercel · Cloudflare Workers · SSH-compatible VPS
                      </small>
                    </div>
                  </div>
                  <Link href="/studio/settings" className={styles.panelLink}>
                    ดูสถานะ integrations <ArrowRight size={14} />
                  </Link>
                </section>
              </div>
            </>
          )}
          {path === "/studio/projects" && (
            <>
              <div className={styles.filterBar}>
                <div className={styles.searchFake}>
                  <FolderKanban size={16} /> <span>โปรเจกต์ทั้งหมด</span>
                </div>
                <span className={styles.muted}>3 รายการ · {DEMO_LABEL}</span>
              </div>
              <div className={styles.projectsGrid}>
                {demoProjects.map((p, i) => (
                  <article className={styles.projectCard} key={p.id}>
                    <div className={styles.cardTop}>
                      <div className={styles.projectIcon}>
                        <Code2 size={19} />
                      </div>
                      <Pill>{p.stage}</Pill>
                    </div>
                    <h2>{p.name}</h2>
                    <p>{p.description}</p>
                    <div className={styles.projectMeta}>
                      <span>
                        <FileCode2 size={14} />
                        {p.framework}
                      </span>
                      <span>
                        <GitBranch size={14} />
                        {p.branch}
                      </span>
                    </div>
                    <div className={styles.projectCardFoot}>
                      <span>{p.updated}</span>
                      <Button
                        className={styles.textButton}
                        onClick={() => action("เปิดสรุปโปรเจกต์")}
                        aria-label={`เปิดสรุป ${p.name}`}
                      >
                        ดูสรุป <ArrowRight size={14} />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <section className={`${styles.panel} ${styles.projectSummary}`}>
                <SectionHead
                  kicker="สรุปโปรเจกต์ · ตัวอย่าง"
                  title="สรุป source และขั้นถัดไป"
                >
                  <Pill>ข้อมูลตัวอย่าง</Pill>
                </SectionHead>
                <div className={styles.summaryGrid}>
                  <div>
                    <small>เฟรมเวิร์ก</small>
                    <b>Next.js · {DEMO_LABEL}</b>
                  </div>
                  <div>
                    <small>สาขาต้นทาง</small>
                    <b>main · ตัวอย่าง</b>
                  </div>
                  <div>
                    <small>สภาพแวดล้อม build</small>
                    <b>ยังไม่มี · planned</b>
                  </div>
                  <div>
                    <small>ปลายทาง deploy</small>
                    <b>ยังไม่เลือก · planned</b>
                  </div>
                </div>
                <p className={styles.panelIntro}>
                  ขั้นถัดไป: เลือก source repository, ตรวจ build isolation
                  และกำหนด target เมื่อ backend พร้อม
                </p>
              </section>
            </>
          )}
          {path === "/studio/projects/new" && (
            <div className={styles.wizardLayout}>
              <section className={styles.panel}>
                <div className={styles.wizardTop}>
                  <div>
                    <div className={styles.kicker}>BROWSER-LOCAL DRAFT</div>
                    <h2>ตั้งค่าพื้นฐาน</h2>
                  </div>
                  <span className={styles.stepCount}>ขั้น {step} / 3</span>
                </div>
                <div className={styles.progress}>
                  <i style={{ width: `${step * 33.33}%` }} />
                </div>
                {created ? (
                  <div className={styles.successDraft} role="status">
                    <Check size={22} />
                    <h3>สร้าง draft ในหน้านี้แล้ว</h3>
                    <p>
                      ข้อมูลนี้อยู่ใน memory ของ browser ระหว่าง session
                      เท่านั้น ไม่มีการบันทึกหรือส่งไปยัง server
                    </p>
                    <div>
                      <b>{name || "Untitled project"}</b>
                      <small>
                        {framework} · {target} · repository ยังไม่เชื่อมต่อ
                      </small>
                    </div>
                    {button("เริ่ม draft ใหม่", () => {
                      setCreated(false);
                      setStep(1);
                      setName("");
                      setNameError("");
                      setTarget("");
                      setTargetError("");
                    })}
                  </div>
                ) : (
                  <>
                    <div className={styles.wizardStep}>
                      <span className={styles.stepIcon}>
                        {step === 1 ? (
                          <FolderKanban size={20} />
                        ) : step === 2 ? (
                          <Code2 size={20} />
                        ) : (
                          <ShieldAlert size={20} />
                        )}
                      </span>
                      <h3>
                        {step === 1
                          ? "ชื่อและ source"
                          : step === 2
                            ? "build profile"
                            : "ตรวจความปลอดภัย"}
                      </h3>
                      <p>
                        {step === 1
                          ? "สร้างรายการตั้งค่าใน browser โดยไม่เชื่อมบัญชีหรือ repository."
                          : step === 2
                            ? "เลือก framework และ target สำหรับ draft ตัวอย่าง — ยังไม่เชื่อมต่อบริการจริง."
                            : "ยืนยันขอบเขต prototype ก่อนสร้าง draft."}
                      </p>
                      {step === 1 && (
                        <div className={styles.formField}>
                          <label htmlFor="projectName">ชื่อโปรเจกต์</label>
                          <Input
                            id="projectName"
                            value={name}
                            onChange={e => {
                              setName(e.target.value);
                              setNameError("");
                            }}
                            aria-invalid={Boolean(nameError)}
                            aria-describedby="project-name-help"
                            required
                            placeholder="เช่น storefront-web"
                            maxLength={60}
                          />
                          <small
                            id="project-name-help"
                            role={nameError ? "alert" : undefined}
                            className={nameError ? styles.formError : undefined}
                          >
                            {nameError ||
                              "จำเป็น · บันทึกชั่วคราวใน state ของหน้านี้เท่านั้น"}
                          </small>
                          <label htmlFor="repoUrl">
                            Repository URL (ไม่เชื่อมต่อ)
                          </label>
                          <Input
                            id="repoUrl"
                            placeholder="ยังไม่เปิดรับ URL ใน prototype"
                            disabled
                          />
                          <small>
                            การเชื่อมต่อ Git จะทำใน server-side integration
                            ที่วางแผนไว้
                          </small>
                        </div>
                      )}
                      {step === 2 && (
                        <div className={styles.wizardSelections}>
                          <div className={styles.wizardOptionGroup}>
                            <div className={styles.optionGroupHeading}>
                              <span>Framework</span>
                              <small>เลือก 1 รายการ</small>
                            </div>
                            <div
                              className={styles.optionList}
                              role="group"
                              aria-label="Framework"
                            >
                              {[
                                "Next.js",
                                "Astro",
                                "Vite",
                                "Node.js อื่น ๆ",
                              ].map(x => (
                                <Button
                                  onClick={() => setFramework(x)}
                                  className={`${styles.option} ${framework === x ? styles.optionSelected : ""}`}
                                  aria-pressed={framework === x}
                                  key={x}
                                >
                                  <span>{x}</span>
                                  <span>
                                    {framework === x ? (
                                      <Check size={16} />
                                    ) : (
                                      "เลือก"
                                    )}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className={styles.wizardOptionGroup}>
                            <div className={styles.optionGroupHeading}>
                              <span>Deployment target</span>
                              <small>ยังไม่เชื่อมต่อ</small>
                            </div>
                            <div
                              className={styles.optionList}
                              role="group"
                              aria-label="Deployment target"
                              aria-describedby="target-help"
                            >
                              {demoTargets.map((item, index) => (
                                <Button
                                  id={
                                    index === 0
                                      ? "target-option-vercel"
                                      : undefined
                                  }
                                  onClick={() => {
                                    setTarget(item.name);
                                    setTargetError("");
                                  }}
                                  className={`${styles.option} ${styles.targetOption} ${target === item.name ? styles.optionSelected : ""}`}
                                  aria-pressed={target === item.name}
                                  aria-label={`${item.name} — ${item.description}`}
                                  key={item.name}
                                >
                                  <span className={styles.optionText}>
                                    <b>{item.name}</b>
                                    <small>{item.kind} · ยังไม่เชื่อมต่อ</small>
                                  </span>
                                  <span>
                                    {target === item.name ? (
                                      <Check size={16} />
                                    ) : (
                                      "เลือก"
                                    )}
                                  </span>
                                </Button>
                              ))}
                            </div>
                            <small
                              id="target-help"
                              role={targetError ? "alert" : undefined}
                              className={
                                targetError ? styles.formError : undefined
                              }
                            >
                              {targetError ||
                                "เลือกเพื่อดูตัวอย่างเท่านั้น · ไม่มีการเชื่อมต่อหรือ deploy จริง"}
                            </small>
                          </div>
                        </div>
                      )}
                      {step === 3 && (
                        <>
                          <div className={styles.reviewSummary}>
                            <div>
                              <small>PROJECT</small>
                              <b>{name}</b>
                            </div>
                            <div>
                              <small>BUILD PROFILE</small>
                              <b>{framework}</b>
                            </div>
                            <div>
                              <small>DEPLOYMENT TARGET · SAMPLE</small>
                              <b>{target}</b>
                            </div>
                          </div>
                          <div className={styles.safetyCallout}>
                            <LockKeyhole size={19} />
                            <div>
                              <b>ไม่มีการส่ง credentials</b>
                              <p>
                                Build code ที่ไม่เชื่อถือต้องทำงานใน isolated
                                environment ห่างจาก control-plane secrets,
                                database และ GitHub credentials. Credentials
                                จริงเก็บเฉพาะใน server-side secret store.
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className={styles.wizardFoot}>
                      {step > 1 ? (
                        <Button
                          className={styles.button}
                          onClick={() => setStep(step - 1)}
                        >
                          <ArrowLeft size={15} /> ย้อนกลับ
                        </Button>
                      ) : (
                        <span className={styles.muted}>
                          ยังไม่มีข้อมูลส่งไป server
                        </span>
                      )}
                      {step < 3
                        ? button(
                            "ถัดไป",
                            goForward,
                            "primary",
                            <ArrowRight size={15} />
                          )
                        : button(
                            "สร้าง draft ใน browser",
                            () => setCreated(true),
                            "primary",
                            <Check size={15} />
                          )}
                    </div>
                  </>
                )}
              </section>
              <aside className={styles.wizardAside}>
                <div className={styles.asideIcon}>
                  <Layers3 size={19} />
                </div>
                <h3>หลังจากนี้จะเกิดอะไรขึ้น?</h3>
                <p>
                  ในระบบจริง draft จะนำไปสู่การเลือก source, isolated build
                  target และ deploy adapter — ขั้นตอนทั้งหมดนี้ยังไม่เชื่อมต่อ
                </p>
                <div className={styles.asideFact}>
                  <b>ไม่มี server write</b>
                  <span>ข้อมูล draft เก็บใน React state เท่านั้น</span>
                </div>
                <div className={styles.asideFact}>
                  <b>ไม่รับ secrets</b>
                  <span>ห้ามใส่ token หรือ credential จริง</span>
                </div>
                <DemoMark />
              </aside>
            </div>
          )}
          {path === "/studio/terminals" && (
            <>
              <div className={styles.safetyBanner}>
                <ShieldAlert size={21} />
                <div>
                  <b>
                    Terminal ในหน้านี้เป็น architecture preview — ยังไม่มี
                    shell, command execution หรือ remote connection
                  </b>
                  <span>
                    ไม่รับคำสั่ง ไม่เปิด SSH และไม่ใช้ credentials ใด ๆ
                  </span>
                </div>
              </div>
              <SectionHead
                kicker="PLANNED TARGETS"
                title="Deploy adapters ที่วางแผนไว้"
              >
                <Pill>ยังไม่เชื่อมต่อ</Pill>
              </SectionHead>
              <div className={styles.targetGrid}>
                {demoTargets.map((t, i) => (
                  <article className={styles.targetCard} key={t.name}>
                    <div className={styles.targetIcon}>
                      {i === 0 ? (
                        <Cloud size={19} />
                      ) : i === 1 ? (
                        <Activity size={19} />
                      ) : (
                        <TerminalSquare size={19} />
                      )}
                    </div>
                    <Pill>{t.state}</Pill>
                    <h3>{t.name}</h3>
                    <small>{t.kind}</small>
                    <p>{t.description}</p>
                    <Button
                      className={styles.button}
                      onClick={() => action(`เชื่อมต่อ ${t.name}`)}
                    >
                      ดูแผนการเชื่อมต่อ <ExternalLink size={14} />
                    </Button>
                  </article>
                ))}
              </div>
              <SectionHead
                kicker="TRUST BOUNDARIES"
                title="Build แยกจาก control plane"
              />
              <div className={styles.safetyGrid}>
                <article className={styles.panel}>
                  <div className={styles.securityHeading}>
                    <LockKeyhole size={18} />
                    <h3>Isolated build environment</h3>
                  </div>
                  <p>
                    ถือว่า repository และ dependency เป็น untrusted input. Build
                    runner ควรแยก process, filesystem, network policy และ
                    runtime identity ออกจากบริการควบคุม.
                  </p>
                  <ul>
                    <li>
                      ไม่ mount หรือ inject production secrets ให้ build code
                    </li>
                    <li>จำกัด network egress และ resource ตาม policy</li>
                    <li>ผูก artifact กับ source revision ที่ตรวจสอบได้</li>
                  </ul>
                </article>
                <article className={styles.panel}>
                  <div className={styles.securityHeading}>
                    <KeyRound size={18} />
                    <h3>Secrets อยู่ฝั่ง server เท่านั้น</h3>
                  </div>
                  <p>
                    Credentials จริงต้องเก็บใน server-side secret store
                    และส่งให้เฉพาะ deploy adapter ที่จำเป็นเท่านั้น
                  </p>
                  <ul>
                    <li>ไม่แสดงหรือเก็บ token ใน browser</li>
                    <li>
                      ไม่เปิดให้ build code อ่าน GitHub, DB หรือ control-plane
                      credentials
                    </li>
                    <li>หมุนเวียนและเพิกถอนตามนโยบาย workspace</li>
                  </ul>
                </article>
              </div>
              <div className={styles.archFlow}>
                {architectureStages.map((s, i) => (
                  <div key={s.title} className={styles.flowItem}>
                    <span>0{i + 1}</span>
                    <b>{s.title.slice(5)}</b>
                    {i < 3 && <ArrowRight size={15} />}
                  </div>
                ))}
              </div>
            </>
          )}
          {path === "/studio/deployments" && (
            <>
              <div className={styles.deployOverview}>
                <div>
                  <span className={styles.kicker}>ACTIVITY FEED</span>
                  <b>ยังไม่มี deployment จริง</b>
                  <small>ข้อมูลด้านล่างจำลองรูปแบบหน้าจอเท่านั้น</small>
                </div>
                <div className={styles.overviewEmpty}>
                  <span>—</span>
                  <small>งานที่กำลังทำ</small>
                </div>
                <div className={styles.overviewEmpty}>
                  <span>—</span>
                  <small>ผลลัพธ์ build</small>
                </div>
                <div className={styles.overviewEmpty}>
                  <span>—</span>
                  <small>รายการ rollback</small>
                </div>
              </div>
              <SectionHead
                kicker="ประวัติตัวอย่าง · fixture"
                title="ลำดับเหตุการณ์"
              >
                <DemoMark />
              </SectionHead>
              <div className={styles.timeline}>
                {demoDeployments.map((d, i) => (
                  <article className={styles.timelineRow} key={d.id}>
                    <div className={styles.timelineRail}>
                      <span>
                        {i === 0 ? <Rocket size={16} /> : <Layers3 size={16} />}
                      </span>
                      {i < demoDeployments.length - 1 && <i />}
                    </div>
                    <div className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <div>
                          <b>{d.project}</b>
                          <small>
                            {d.id} · {d.time}
                          </small>
                        </div>
                        <Pill red>{d.status}</Pill>
                      </div>
                      <div className={styles.timelineMeta}>
                        <span>
                          <GitBranch size={14} />
                          {d.branch} · ตัวอย่าง
                        </span>
                        <span>
                          <Cloud size={14} />
                          {d.target}
                        </span>
                      </div>
                      <div className={styles.deployBottom}>
                        <code>{d.url}</code>
                        <Link
                          href={`/studio/deployments/${d.id}`}
                          className={styles.inlineLink}
                        >
                          ดูบันทึกตัวอย่าง <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className={styles.demoFootnote}>
                <CircleHelp size={15} /> รายการและเวลาเป็น fixture จำลอง
                ไม่ใช่ประวัติ deploy, live URL หรือผลสำเร็จจากระบบ
              </p>
            </>
          )}
          {path.startsWith("/studio/deployments/") && selectedDeployment && (
            <>
              <Link href="/studio/deployments" className={styles.backLink}>
                <ArrowLeft size={15} /> กลับไป timeline
              </Link>
              <div className={styles.deployDetailHead}>
                <div>
                  <div className={styles.kicker}>
                    DEPLOYMENT DETAIL · FIXTURE
                  </div>
                  <h2>{selectedDeployment.project}</h2>
                  <p>
                    รหัส {selectedDeployment.id} · {selectedDeployment.time} ·{" "}
                    {DEMO_LABEL}
                  </p>
                </div>
                <Pill red>ยังไม่มี deployment จริง</Pill>
              </div>
              <div className={styles.detailGrid}>
                <section className={styles.panel}>
                  <SectionHead kicker="SAMPLE RUN" title="รายละเอียดตัวอย่าง" />
                  <div className={styles.summaryGrid}>
                    <div>
                      <small>โปรเจกต์</small>
                      <b>{selectedDeployment.project} · ตัวอย่าง</b>
                    </div>
                    <div>
                      <small>ปลายทาง</small>
                      <b>{selectedDeployment.target} · ยังไม่เชื่อมต่อ</b>
                    </div>
                    <div>
                      <small>สาขา source</small>
                      <b>{selectedDeployment.branch} · fixture</b>
                    </div>
                    <div>
                      <small>ผลลัพธ์ build</small>
                      <b>ไม่มี artifact จริง</b>
                    </div>
                  </div>
                  <div className={styles.safetyCallout}>
                    <ShieldAlert size={18} />
                    <div>
                      <b>สถานะนี้ไม่ใช่ผล build/deploy</b>
                      <p>
                        ยังไม่มีการเริ่ม run, URL ใช้งานจริง, artifact หรือ
                        rollback
                      </p>
                    </div>
                  </div>
                </section>
                <section className={styles.panel}>
                  <SectionHead
                    kicker="ผลลัพธ์ build · ตัวอย่าง"
                    title="บันทึกการทำงานจำลอง"
                  />
                  <div className={styles.logHeader}>
                    <span />
                    <span /> ข้อมูลตัวอย่าง · อ่านอย่างเดียว
                  </div>
                  <pre className={styles.logViewer}>
                    {demoLog.map((l, i) => (
                      <span key={i}>
                        <i>{String(i + 1).padStart(2, "0")}</i>
                        {l}
                      </span>
                    ))}
                  </pre>
                  <DemoMark />
                </section>
              </div>
            </>
          )}
          {path.startsWith("/studio/deployments/") && !selectedDeployment && (
            <section className={styles.panel}>
              <div className={styles.safetyCallout}>
                <CircleHelp size={18} />
                <div>
                  <b>ไม่พบข้อมูลตัวอย่างรายการนี้</b>
                  <p>
                    รหัส {deploymentId} ไม่ตรงกับ fixture ที่มีอยู่
                    หน้านี้ไม่ได้ค้นหา server หรือข้อมูล deployment จริง
                  </p>
                </div>
              </div>
              <Link href="/studio/deployments" className={styles.backLink}>
                <ArrowLeft size={15} /> กลับไปหน้ารายการ
              </Link>
            </section>
          )}
          {path === "/studio/settings" && (
            <>
              <div className={styles.settingsIntro}>
                <div className={styles.settingsSymbol}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2>การเชื่อมต่อที่วางแผนไว้</h2>
                  <p>
                    ยังไม่มี integration เชื่อมต่อหรือ credential ใน workspace
                    นี้
                  </p>
                </div>
                <Pill red>ยังไม่เชื่อมต่อ</Pill>
              </div>
              <SectionHead
                kicker="ตัวอย่าง integrations"
                title="แหล่งที่มาและปลายทาง"
              />
              <div className={styles.integrationList}>
                {[
                  {
                    icon: <GitBranch size={18} />,
                    name: "ระบบจัดการซอร์สโค้ด",
                    desc: "Repository, branch และ commit ที่อนุญาต",
                    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
                  },
                  {
                    icon: <Cloud size={18} />,
                    name: "Vercel",
                    desc: "Deploy adapter สำหรับ web app",
                    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
                  },
                  {
                    icon: <Activity size={18} />,
                    name: "Cloudflare Workers",
                    desc: "Deploy adapter สำหรับ edge runtime",
                    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
                  },
                  {
                    icon: <TerminalSquare size={18} />,
                    name: "SSH-compatible VPS",
                    desc: "Remote deployment target",
                    state: "วางแผนไว้ · ยังไม่เชื่อมต่อ",
                  },
                ].map(x => (
                  <article className={styles.integration} key={x.name}>
                    <span className={styles.integrationIcon}>{x.icon}</span>
                    <div className={styles.integrationInfo}>
                      <b>{x.name}</b>
                      <small>{x.desc}</small>
                    </div>
                    <Pill>{x.state}</Pill>
                    <Button
                      className={styles.button}
                      onClick={() => action(`เชื่อมต่อ ${x.name}`)}
                    >
                      ดูแผนการเชื่อมต่อ <ArrowRight size={14} />
                    </Button>
                  </article>
                ))}
              </div>
              <div className={styles.settingsColumns}>
                <section className={styles.panel}>
                  <div className={styles.securityHeading}>
                    <LockKeyhole size={18} />
                    <h3>Secrets & credentials</h3>
                  </div>
                  <p>
                    Credentials จริงต้องเก็บใน <b>server-side secret store</b>{" "}
                    และเข้าถึงผ่าน backend เท่านั้น ไม่รับหรือเก็บ secret ใน
                    browser prototype นี้
                  </p>
                  <div className={styles.noSecrets}>
                    <LockKeyhole size={15} /> ไม่มีช่องกรอก secret · ไม่มี
                    secret ถูกเก็บ
                  </div>
                </section>
                <section className={styles.panel}>
                  <div className={styles.securityHeading}>
                    <Activity size={18} />
                    <h3>Environment status</h3>
                  </div>
                  <div className={styles.statusLine}>
                    <span>Build runner</span>
                    <Pill>ยังไม่มี · planned</Pill>
                  </div>
                  <div className={styles.statusLine}>
                    <span>Terminal session</span>
                    <Pill>ยังไม่มี · planned</Pill>
                  </div>
                  <div className={styles.statusLine}>
                    <span>Deploy adapters</span>
                    <Pill>ยังไม่เชื่อมต่อ</Pill>
                  </div>
                  <div className={styles.statusLine}>
                    <span>Audit logs</span>
                    <Pill>ยังไม่มี · planned</Pill>
                  </div>
                </section>
              </div>
              <div className={styles.finalGuidance}>
                <ShieldAlert size={18} />
                <p>
                  <b>ขั้นถัดไป:</b> ออกแบบ backend integration, authorization
                  และ isolated runner ก่อนเปิดให้เชื่อมต่อ target จริง
                </p>
              </div>
            </>
          )}
          <footer className={styles.footer}>
            <span>
              ai-sdk.pro <i /> Studio Workbench
            </span>
            <span>
              <span className={styles.footerDot} /> UI prototype · no live
              infrastructure
            </span>
          </footer>
        </div>
      </main>
      {notice && (
        <div role="status" aria-live="polite" className={styles.toast}>
          <ShieldAlert size={17} />
          {notice}
          <button aria-label="ปิดข้อความ" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
