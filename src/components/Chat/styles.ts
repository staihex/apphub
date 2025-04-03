// antX 样式
import { createStyles } from "antd-style";
export const useStyles = createStyles(({ token, css }) => {
  return {
    chat: css`
      height: 100%;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 24px 24px 0px 24px;
      gap: 16px;
    `,
    messages: css`
      flex: 1;
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
  }
})