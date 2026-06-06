import type { ReactNode } from "react";
import styles from "./styles.module.css";
import Loading from "../loading";

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="global_loading">
            {/* <img src="/img/loading.png" alt="" /> */}
            <Loading />
          </div>
        </div>
      </div>
    </section>
  );
}
