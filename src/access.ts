/**
 * @see https://umijs.org/docs/max/access#access
 */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};

  return {
    // chỉ admin
    canAdmin: currentUser?.access === 'Admin',

    // chỉ user
    canUser: currentUser?.access === 'User' || currentUser?.access === 'Admin', // User hoặc Admin

    // ai đăng nhập cũng được
    canLogin: !!currentUser,
  };
}
