convert = require('ebook-convert')
rreaddir = require('recursive-readdir')

async function convertAsync(options) {
  return new Promise((resolve, reject) => {
    convert(options, function (error) {
      if (error) { return reject(error) }
      return resolve()
    })
  })
}

dirPath = '/home/srghma/gdrive'

filesAbsPath = (await rreaddir(dirPath)).map(x => require('path').join(dirPath, x))

function cleanFilename(filepath) {
  const newFilepath = filepath
    .replace(' (z-lib.org)', '')
    .replace(' (z-lib.or', '')
    .replace('’', '')
    .replace('_z_lib_or', '')
    .replace(/\.+(pdf|fb2|epub)$/gi, '.$1')
    .replace('.epub.pdf', '.pdf');
  return newFilepath

}

await Promise.all(filesAbsPath.map(filepath => { const newFilepath = cleanFilename(filepath); return require('fs/promises').rename(filepath, newFilepath) }))

async function listFiles(directory) {
    const dirents = await require('fs/promises').readdir(directory, { withFileTypes: true });
    return dirents
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);
}

filesAbsPath = (await listFiles(dirPath)).map(x => require('path').join(dirPath, x))
nonPdfFiles = filesAbsPath.filter(filepath => !filepath.endsWith('.pdf'))

await require('fs/promises').mkdir(`/home/srghma/gdrive-non-pdf`)
promises = nonPdfFiles.map(filepath => {
  const nameAndExt = require('path').parse(filepath).base
  const newFilepath = `/home/srghma/gdrive-non-pdf/${nameAndExt}`
  return require('fs/promises').rename(filepath, newFilepath)
})
await Promise.all(promises)

filesAbsPath = (await require('fs/promises').readdir(`/home/srghma/gdrive-non-pdf/`)).map(x => require('path').join(`/home/srghma/gdrive-non-pdf/`, x))
if (filesAbsPath.filter(filepath => filepath.endsWith('.pdf')).length > 0) { throw new Error('') }

promises = filesAbsPath.map(filepath => {
  const filenameWithoutDir = require('path').parse(filepath).name
  const newFilepath = `${dirPath}/${filenameWithoutDir}.pdf`
  return convertAsync({
    input: filepath,
    output: newFilepath,
    pdfDefaultFontSize: 12,
    pageBreaksBefore: '//h:h1',
    chapter: '//h:h1',
    pdfPageNumbers: true,
    insertBlankLine: true,
    insertBlankLineSize: '1',
    lineHeight: '12',
    marginTop: '50',
    marginRight: '50',
    marginBottom: '50',
    marginLeft: '50'
  })
})
await Promise.all(promises)
