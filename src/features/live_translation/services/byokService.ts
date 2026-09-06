export async function getOrgIdByInviteCode(inviteCode: string): Promise<string | null> {
  if (!inviteCode || typeof inviteCode !== 'string') {
    return null;
  }
  return inviteCode.trim();
}
