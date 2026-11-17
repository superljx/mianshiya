import Link from "next/link";
import BankCover from "@/components/BankCover";
import GuestActions from "@/components/GuestActions";
import { ArrowRightOutlined, CodeOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import styles from "./page.module.css";
import { serverRequest } from "@/lib/serverRequest";

interface HomeRecord { id: string | number; title?: string; description?: string; picture?: string; }
interface HomePageData { records: HomeRecord[]; }

export default async function Home() {
  const [banks, questions] = await Promise.allSettled([
    serverRequest<HomePageData>("/questionBank/list/page/vo", { current: 1, pageSize: 6 }),
    serverRequest<HomePageData>("/question/list/page/vo", { current: 1, pageSize: 8 }),
  ]);
  return (
    <main id="homePage" className="page-container">
      <section className={styles.hero}>
        <div className={styles.eyebrow}>程序员面试刷题平台</div>
        <h1>每一次练习，<br />都离理想的 Offer 更近一步。</h1>
        
        <GuestActions primaryClassName={styles.primaryLink} secondaryClassName={styles.secondaryLink} />
      </section>
      <section className={styles.contentSection}>
        <h2>最新题库 <Link href="/banks">查看全部 →</Link></h2>
        {banks.status === "fulfilled" ? banks.value.records.length ? <div className={styles.grid}>{banks.value.records.map((bank) => <Link className={styles.card} href={`/bank/${bank.id}`} key={bank.id}><div className={styles.bankRow}><BankCover src={bank.picture} title={bank.title} /><div className={styles.bankText}><h3 className={styles.bankTitle}>{bank.title || "未命名题库"}</h3><p className={styles.bankDescription}>{bank.description?.trim() || "暂无题库介绍"}</p></div></div><p className={styles.bankAction}>进入题库，开始练习 →</p></Link>)}</div> : <p>暂无题库</p> : <p>题库加载失败，请稍后重试。</p>}
      </section>
      <section className={styles.contentSection}>
        <h2>最新题目 <Link href="/questions">查看全部 →</Link></h2>
        {questions.status === "fulfilled" ? questions.value.records.length ? <div className={styles.questionList}>{questions.value.records.map((question) => <Link href={`/question/${question.id}`} key={question.id}>{question.title || "未命名题目"}<ArrowRightOutlined /></Link>)}</div> : <p>暂无题目</p> : <p>题目加载失败，请稍后重试。</p>}
      </section>
      <section className={styles.grid} aria-label="平台能力">
        <article className={styles.card}><UserOutlined /><h2>账号体系</h2><p>账号密码登录、用户注册与全局登录状态管理。</p></article>
        <article className={styles.card}><SafetyCertificateOutlined /><h2>权限控制</h2><p>按用户角色展示导航，保护管理员页面访问。</p></article>
        <article className={styles.card}><CodeOutlined /><h2>前端开发模板</h2><p>基于 Next.js、Ant Design 和 TypeScript 构建，持续完善业务功能。</p></article>
      </section>
    </main>
  );
}
