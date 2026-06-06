import React, { FC } from "react";
import classNames from "clsx";
import styles from "./index.module.css";
export const loadingSizeArray = ["md", "sm", "lg"] as const;

type TLoadingSize = (typeof loadingSizeArray)[number];

type IProps = React.HTMLAttributes<HTMLDivElement> & {
  // ... 其他的属性
  size?: TLoadingSize;
};

/**
 * @description ME 官网自定义 Loading
 * @example
 *   // 基本使用
 *   <Loading />
 *
 *   // 自定义 className
 *   <Loading className="custom-class" />
 *
 *   // 自定义 style
 *   <Loading style={{ background: 'pink' }} />
 *
 *   // 自定义 size
 *   <Loading size="sm" />
 */
const LottieLoading: FC<IProps> = ({ className, size = "md", ...rest }) => {
  return (
    <div
      className={classNames(
        styles.loadingContent,
        {
          [styles[`loadingContent${size.toUpperCase()}`]]:
            loadingSizeArray.includes(size) && size !== "md",
        },
        className,
      )}
      {...rest}
    >
      <img
        src="/img/logo-bg.png"
        className={styles["loading-glow"]}
        alt="glow"
      />
      <img
        src="/img/global_loading.png"
        className={styles["loading-icon"]}
        alt="icon"
      />
    </div>
  );
};

export default LottieLoading;
