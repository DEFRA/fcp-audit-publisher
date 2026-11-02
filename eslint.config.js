import { neostandard, resolveIgnoresFromGitignore } from 'neostandard'

export default [
  { ignores: [...resolveIgnoresFromGitignore(), 'dist/**'] },
  ...neostandard()
]
