import { useEffect, type ReactNode } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";

export default function Home(): ReactNode {
  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) return;
    const timer = setTimeout(() => {
      window.location.assign("/docs/intro");
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
