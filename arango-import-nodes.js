const fs = require('fs-extra');
const {Database} = require('arangojs');
const R = require('ramda');
const ntype = require('./ntid');
const ProgressBar = require('progress');
const Bromise = require('bluebird');

// const db = new Database();
const db = new Database({
  url: 'http://arango-hmdl:8529'
});
db.useBasicAuth('root', 'mdp');
const graph = db.graph('lirmm');

const nodeRegex = /eid=(?<eid>[0-9]{1,})\|n="(?<n>.*)"\|t=(?<t>[0-9]{1,})\|w=(?<w>[0-9]{1,})(\|nf="(?<nf>.*)")?/;

const words = graph.vertexCollection('words');

let bar;

const parse = R.pipe(
  R.match(nodeRegex),
  R.prop('groups'),
  R.ifElse(
    R.isNil,
    R.always('NOT HANDLED'),
    R.applySpec({
      _key: R.prop('eid'),
      word: R.prop('n'),
      type: R.prop('t'),
      weight: R.prop('w'),
      normalForm: R.prop('nf')
    })
  ),
  R.tap(() => bar.tick())
);

const bulkImportFile = R.pipeP(
  f => {
    console.log(`Now processing : ${f}`);
    return fs.readFile(`./files/${f}`, 'utf8');
  },
  R.split('\n'),
  R.filter(x =>
    R.and(R.complement(R.equals(''))(x), R.gt(0, R.indexOf('/', x)))
  ),
  R.tap(
    R.pipe(
      R.length,
      x => {
        bar = new ProgressBar('Parsing [:bar] :current/:total :etas :rate/s', {
          total: x,
          width: 40
        });
      }
    )
  ),
  R.map(parse),
  R.filter(R.complement(R.equals('NOT HANDLED'))),
  x => words.import(x)
);

const main = R.pipeP(
  () => fs.readdir('./files'),
  filesList => Bromise.each(filesList, bulkImportFile)
);

console.time('LIRMM to DB');
main().then(() => {
  console.timeEnd('LIRMM to DB');
});
