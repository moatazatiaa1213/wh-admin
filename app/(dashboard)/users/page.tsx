import { Topbar } from '@/components/topbar'
import { DeleteEntityButton } from '@/components/delete-entity-button'
import { UserForm } from '@/components/user-form'
import { listUsers } from '@/lib/users'

// Reads directly from Postgres (not Next's fetch cache), so without this
// Next.js can statically cache the page and hide newly created/deleted users.
export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const rootUser = process.env.ADMIN_USER

  let users: Awaited<ReturnType<typeof listUsers>> = []
  let dbError: string | null = null
  try {
    users = await listUsers()
    console.log('[DEBUG users/page] listUsers() returned:', JSON.stringify(users), 'DATABASE_URL host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0])
  } catch (e) {
    dbError = (e as Error).message ?? String(e)
    console.log('[DEBUG users/page] listUsers() threw:', dbError)
  }

  if (dbError) {
    return (
      <div>
        <Topbar title="Users" subtitle="Additional admin accounts" />
        <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg p-6">
          <p className="text-sm font-medium text-zinc-200 mb-1.5">Database isn&apos;t configured yet</p>
          <p className="text-sm text-zinc-500 mb-3">
            Creating additional admin users needs a Postgres connection. Add{' '}
            <code className="text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded">DATABASE_URL</code>{' '}
            to your environment (see <code className="text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded">.env.local.example</code>) and reload this page.
          </p>
          <p className="text-xs text-zinc-600 mb-1">Meanwhile, the root account still works:</p>
          <p className="text-sm text-zinc-300">{rootUser ?? '(ADMIN_USER not set)'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar
        title="Users"
        subtitle={`${users.length} admin user${users.length !== 1 ? 's' : ''}`}
        action={<UserForm />}
      />

      <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c]">
              {['Username', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rootUser && (
              <tr className="border-b border-[#1c1c1c] last:border-0">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-zinc-200">{rootUser}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-zinc-500">—</td>
                <td className="px-5 py-3.5 text-xs text-zinc-600">Root (from env, cannot be removed here)</td>
              </tr>
            )}
            {users.length === 0 && !rootUser ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No users found. Add one to get started.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.username} className="border-b border-[#1c1c1c] last:border-0 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-zinc-200">{user.username}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <DeleteEntityButton apiUrl={`/api/users/${user.username}`} label={user.username} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
