import type { FC } from "react";

type Props = {
  onSubmit?: () => void;
};

export const ProfileForm: FC<Props> = ({ onSubmit }) => (
  <form method="post" onSubmit={onSubmit}>
    <label>
      Full Name
      <input type="text" name="fullName" required />
    </label>
    <label>
      Timezone
      <input type="text" name="timezone" required />
    </label>
    <button type="submit">Continue</button>
  </form>
);
