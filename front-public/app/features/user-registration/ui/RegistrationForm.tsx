import type { FC } from "react";

type Props = {
  defaultEmail?: string;
};

export const RegistrationForm: FC<Props> = ({ defaultEmail }) => (
  <form method="post">
    <label>
      Email
      <input type="email" name="email" defaultValue={defaultEmail} required />
    </label>
    <label>
      Password
      <input type="password" name="password" minLength={12} required />
    </label>
    <button type="submit">Register</button>
  </form>
);
