import type { FC, FormEventHandler } from "react";

type Props = {
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export const UserForm: FC<Props> = ({ onSubmit }) => (
  <form method="post" onSubmit={onSubmit}>
    <label>
      Email
      <input type="email" name="email" required />
    </label>
    <label>
      Role
      <select name="role" defaultValue="member">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
    </label>
    <button type="submit">Save</button>
  </form>
);
