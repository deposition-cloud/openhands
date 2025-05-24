const releaseImageTag = 'latest'
const devImageSuffix = 'dev'
const additionalTags = ['next', 'next-major', 'beta', 'alpha']

function orphan(
  strings: TemplateStringsArray,
  ...values: (string | undefined)[]
) {
  const fullPath =
    strings[0] + values.map((v, i) => (v ?? '') + strings[i + 1]).join('')

  // Split the path by '/' and remove the first element (root namespace)
  const pathParts = fullPath.split('/')
  pathParts.shift() // Remove the root namespace (first part)

  return pathParts.join('/')
}

function hyphenate(
  strings: TemplateStringsArray,
  ...values: (string | undefined)[]
) {
  const fullPath =
    strings[0] + values.map((v, i) => (v ?? '') + strings[i + 1]).join('')

  // Replace all '/' with '-'
  return fullPath.replace(/\//g, '-')
}
const registries = [
  {
    url: 'registry.gitlab.com',
    imageName: process.env.CI_REGISTRY_IMAGE,
    user: 'CI_REGISTRY_USER',
    password: 'CI_REGISTRY_PASSWORD'
  },
  {
    url: 'docker.io',
    imageName: `docker.io/depositioncloud/${hyphenate`${orphan`${process.env.CI_PROJECT_PATH}`}`}`,
    user: 'DOCKER_REGISTRY_USER',
    password: 'DOCKER_REGISTRY_PASSWORD'
  },
  {
    url: 'ghcr.io',
    imageName: `ghcr.io/deposition-cloud/${hyphenate`${orphan`${process.env.CI_PROJECT_PATH}`}`}`,
    user: 'GITHUB_USER',
    password: 'GITHUB_TOKEN'
  }
]

export default {
  branches: [
    '+([0-9])?(.{+([0-9]),x}).x',
    'main',
    'next',
    'next-major',
    {
      name: 'beta',
      prerelease: true
    },
    {
      name: 'alpha',
      prerelease: true
    }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/gitlab',
    [
      '@semantic-release/npm',
      {
        npmPublish: false
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'docs/CHANGELOG.md',
        changelogTitle: `# ${process.env.CI_PROJECT_TITLE} Changelog`
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'docs/CHANGELOG.md'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    [
      '@eclass/semantic-release-docker',
      {
        // Development images
        baseImageName: `${process.env.CI_PROJECT_NAME}-${devImageSuffix}`,
        releaseImageTag,
        additionalTags,
        registries: registries.map((registry) => ({
          ...registry,
          imageName: registry.imageName!.includes('gitlab')
            ? `${registry.imageName}/${devImageSuffix}` // Use `/` for gitlab registries
            : `${registry.imageName}-${devImageSuffix}` // Use `-` for other registries
        }))
      }
    ],
    [
      '@eclass/semantic-release-docker',
      {
        // Production images
        baseImageName: process.env.CI_PROJECT_NAME,
        releaseImageTag,
        additionalTags,
        registries
      }
    ]
  ]
}
