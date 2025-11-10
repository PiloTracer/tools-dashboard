import type { FC } from "react";

type User = {
  id: string;
  email: string;
};

type Props = {
  users: User[];
};

export const UserTable: FC<Props> = ({ users }) => (
  <table>
    <thead>
      <tr>
        <th scope="col">Email</th>
      </tr>
    </thead>
    <tbody>
      {users.map((user) => (
        <tr key={user.id}>
          <td>{user.email}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
