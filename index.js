dirPath = '/home/srghma/gdrive'
// dirPath = '/home/srghma/Downloads'
// dirPath = '/home/srghma/other-disk/matlab'

var assert = require('assert')
var exec = require('child_process').exec

var exists = require('command-exists')
var toFlags = require('to-flags')
var xtend = require('xtend')

function ebookConvert(args, options, callback) {
  assert.equal(typeof args, 'object', 'args object is required')
  assert.equal(typeof args.input, 'string', 'string filepath of input file is required')
  assert.equal(typeof args.output, 'string', 'string filepath of output file is required')

  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  var input = args.input
  var output = args.output
  delete args.input
  delete args.output

  exists('ebook-convert', function (err, ok) {
    if (err || !ok) {
      var msg = 'Error: ebook-convert command must be installed as part of calibre. Find instructions at http://calibre-ebook.com'
      return callback(new Error(msg))
    }
    args = toFlags(args).join(' ')
    var cmd = 'ebook-convert "' + input + '" "' + output + '" ' + args
    exec(cmd, options, callback)
  })
}
/////

async function convertAsync(options) {
  return new Promise((resolve, reject) => {
    ebookConvert(options, function (error) {
      if (error) { return reject(error) }
      return resolve()
    })
  })
}

////////////////

rreaddir = require('recursive-readdir')
moveFile = require('@npmcli/move-file')
const fs = require('fs')
const os = require('os')
const path = require('path')

// var docxConverter = require('docx-pdf')

// async function listFiles(directory) {
//   const dirents = await require('fs/promises').readdir(directory, { withFileTypes: true });
//   return dirents
//       .filter(dirent => dirent.isFile())
//       .map(dirent => dirent.name);
// }

filesAbsPath = await rreaddir(dirPath)

function cleanFilename(filepath) {
  const newFilepath = filepath
    .replace(' (z-lib.org)', '')
    .replace(' ( etc.)', '')
    .replace('avidreaders.ru__', '')
    .replace(' (z-lib.or', '')
    .replace('’', '')
    .replace('...', '')
    .replace('_z_lib_or', '')
    .replace(/\.+(pdf|fb2|epub)$/gi, '.$1')
    .replace('.epub.pdf', '.pdf')
    .replace(/\s+/g, ' ');
  return newFilepath
}

updated = filesAbsPath.map(filepath => ({ filepath, newFilepath: cleanFilename(filepath) })).filter(x => x.filepath !== x.newFilepath)

await Promise.all(updated.map(x => { return require('fs/promises').rename(x.filepath, x.newFilepath) }))

filesAbsPath = await rreaddir(dirPath)
tmpDirEpub = fs.mkdtempSync(path.join(os.tmpdir(), 'ebook-converter--epub--'))
tmpDirPdf = fs.mkdtempSync(path.join(os.tmpdir(), 'ebook-converter--pdf--'))
console.log({ tmpDirEpub, tmpDirPdf })

function isConvertable(filepath) {
  const isPdf = filepath.endsWith('.pdf')
  if (isPdf) { return false }
  if (filepath.endsWith('.fb2.zip')) { return true }
  if (filepath.endsWith('.fb2')) { return true }
  if (filepath.endsWith('.epub')) { return true }
  if (filepath.endsWith('.djvu')) { return true }
  if (filepath.endsWith('.djv')) { return true }
  if (filepath.endsWith('.doc')) { return true }
  if (filepath.endsWith('.docx')) { return true }
  return false
}

newPaths = filesAbsPath.filter(isConvertable)
newPaths = newPaths.map(filepath => require('path').parse(filepath))
newPaths = newPaths.map(({ dir, base, name }) => {
  return {
    epub_inOriginalDir: `${dir}/${base}`,
    pdf_inOriginalDir:  `${dir}/${name}.pdf`,
    epub_inTmp:         `${tmpDirEpub}/${base}`,
    pdf_inTmp:          `${tmpDirPdf}/${name}.pdf`,
  }
})

// move
promises = newPaths.map(x => {
  return moveFile(x.epub_inOriginalDir, x.epub_inTmp)
})
await Promise.all(promises)

options = {
  pdfDefaultFontSize: 18,
  pageBreaksBefore: '//h:h1',
  chapter: '//h:h1',
  pdfPageNumbers: true,
  insertBlankLine: true,
  insertBlankLineSize: '1',
  lineHeight: '21',
  marginTop: '15',
  marginRight: '15',
  marginBottom: '15',
  marginLeft: '15'
}
promises = newPaths.map(async x => {
  try {
    // if (x.epub_inTmp.endsWith('.doc')) {
    //   var docxConverter = require('docx-pdf');
    //   docxConverter('./input.docx','./output.pdf',function(err,result){
    //     if(err){
    //       console.log(err);
    //     }
    //     console.log('result'+result);
    //   });
    //   its basically docxConverter(inputPath,outPath,function(err,result){
    //     if(err){
    //       console.log(err);
    //     }
    //     console.log('result'+result);
    //   });
    // }
    await convertAsync({
      input: x.epub_inTmp,
      output: x.pdf_inTmp,
      ...options
    })
  } catch (e) {
    console.log(e)
  }
})
await Promise.all(promises)

promises = newPaths.map(async x => {
  try {
    await require('fs/promises').rename(x.pdf_inTmp, x.pdf_inOriginalDir)
    await require('fs/promises').unlink(x.epub_inTmp)
  } catch (e) {
    console.log(e)
    try {
      await moveFile(x.epub_inTmp, x.epub_inOriginalDir)
    } catch (e) {
      console.log(e)
    }
  }
})
await Promise.all(promises)
