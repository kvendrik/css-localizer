import fs from 'fs';

class Localizer {
  constructor(options) {
    this._html = null;
    this._styles = null;
    this._options = options;
  }

  parse(filePath) {
    const {saltLength} = this._options;
    this._html = this._readFile(filePath);

    const tags = this._html.match(/\{([^\}]+)\}/g);

    let stylesFileName = null;
    let stylesPath = null;

    for (const [index, tag] of tags.entries()) {
      const tagMatch = tag.match(/\{(include\s)?([^\}]+)\}/);
      const isIncludeTag = (tagMatch[1] === 'include ');

      if (isIncludeTag) {
        if (index > 0) {
          console.log(`${filePath}: include tags need to be the first tag`);
          process.exit(1);
        }

        const relativePath = tagMatch[2];
        const absolutePath = filePath.replace(/\/[^\/]+$/, `/${relativePath}`)

        stylesFileName = relativePath.match(/([^\.\/]+)\..+$/)[1];
        stylesPath = absolutePath;

        this._html = this._html.replace(tagMatch[0], '');
        this._styles = this._readFile(absolutePath);

        continue;
      }

      const className = tagMatch[2];
      const salt = this._genRandStr(saltLength || 4);
      this._replaceClass(className, `${stylesFileName}__${className}__${salt}`);
    }

    this._writeFiles(
      this._insertBuildExtension(filePath),
      this._insertBuildExtension(stylesPath)
    );
  }

  _replaceClass(name, newName) {
    this._html = this._html.replace(`{${name}}`, `"${newName}"`);
    this._styles = this._styles.replace(`.${name}`, `.${newName}`);
  }

  _readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  _genRandStr(length = 41){
    // Math.random returns number with length between 16 and 18 chars
    // if length below 16 do in one go
    if (length <= 16) {
      return Math.random().toString(36).substring(2,length+2);
    }

    // else calculate how many iterations we need
    const iterations = Math.ceil(length / 16);
    let outputStr = '';

    for(let i = 0; i < iterations; i++){
      outputStr += Math.random().toString(36).substring(2,18);
    }

    // correct length if it's too high
    if(outputStr.length > length) {
      outputStr = outputStr.substring(0,length);
    }

    return outputStr;
  }

  _insertBuildExtension(filePath) {
    const postFix = this._options.postFix || '.build';
    return filePath.replace(/\.([^\/]+)$/, `${postFix}.$1`);
  }

  _writeFiles(writeMarkupPath, writeStylesPath) {
    fs.writeFileSync(writeMarkupPath, this._html);
    fs.writeFileSync(writeStylesPath, this._styles);
  }
}

export default function(dirPath, options) {
  function readDir(path) {
    const folders = [];
    const allMarkupFiles = fs.readdirSync(path);

    for (const [index, fileName] of allMarkupFiles.entries()) {
      if (!/\.[^\.]+$/.test(fileName)) {
        folders.push(fileName);
        continue;
      }
      if (!fileName.includes('.html') || fileName.includes(options.postFix || '.build')) {
        continue;
      }
      localizer.parse(`${path}/${fileName}`);
    }

    for (const folder of folders) {
      readDir(`${path}/${folder}`);
    }
  }

  const localizer = new Localizer(options);
  readDir(dirPath);
}
