const { Command, Option } = require('commander');
const fs = require('fs');
const xml2js = require('xml2js');
const tmp = require('tmp');
const exec = require('child_process').exec;
const program = new Command();

program.name("x2j")
    .version("1.0.0")
    .description("Convert XML to JSON")

program.arguments("<xml>")
    .description("XML file to convert")
    .option("-o, --stdout", "output to stdout", false)
    .option("-c, --code", "output to temporary file and open with Visual Studio Code", true)
    .option("-p, --pretty", "pretty print (formatted)", true)
    .addOption(
        new Option("-f, --fmt <format>", "output format")
        .choices(["json", "yaml", "toml"])
        .default("json")
    )
    .action(xml).parse(process.argv);

//if string value is empty, return null, else return string
function isEmpty(str, name) {
    return str === '' ? null : str;
}

//return number if string is number, else return same string
function toNumber(str, name) {
    return isNaN(str) ? str : parseFloat(str);
}

//convert true or false as strings to boolean,
//else return same string
function toBoolean(str, name) {
    if (typeof str === 'string') {
        var val = str.toLowerCase();
        switch (val) {
            case "true":
            case "yes":
                return true;
            case "false":
            case "no":
                return false;
            default:
                return str;
        }
    } else {
        return str;
    }
}

function xml(filename, options) {
    //console.log({ filename, options });
    _xml(filename, options);
}

function _xml(filename, options) {
    //if filename doesn't exist, exit with error
    if (!fs.existsSync(filename)) {
        console.error("File not found");
        process.exit(1);
    }
    //read xml file
    try {
        var xml = fs.readFileSync(filename, 'utf8');
        var parser = new xml2js.Parser({
            mergeAttrs: true,
            preserveChildrenOrder: true,
            trim: true,
            normalize: true,
            explicitArray: false,
            charkey: 'content',
            attrValueProcessors: [toNumber, isEmpty, toBoolean],
            valueProcessors: [toNumber, isEmpty, toBoolean]
        });

        parser.parseString(xml, function(err, result) {
            if (err) {
                console.error(err);
                process.exit(1);
            } else {
                switch (options.fmt) {
                    case "json":
                        var out = JSON.stringify(result, null, options.pretty ? 4 : 0);
                        break;
                    case "yaml":
                        var out = require('js-yaml').dump(result);
                        break;
                    case "toml":
                        var out = require('tomlify-j0.4').toToml(result, {
                            space: options.pretty ? 2 : 0
                        });
                        break;
                }
                if (options.stdout) {
                    console.log(out);
                } else if (options.code) {
                    var tmpobj = tmp.fileSync({ postfix: '.' + options.fmt });
                    fs.writeFileSync(tmpobj.name, out);
                    exec('code ' + tmpobj.name, function(err, stdout, stderr) {
                        if (err) {
                            console.error(err);
                            process.exit(1);
                        }
                    })
                } else {
                    fs.writeFileSync(filename + '.' + options.fmt, out);
                }

            }
        })
    } catch (err) {
        console.error("Error", err);
        process.exit(1);
    }

}