export const PER_PAGE = 100;

export function getStargazersUrl(repo) {
  return `https://api.github.com/repos/${repo}/stargazers`;
}
