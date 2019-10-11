const {Database, aql} = require('arangojs');

// const db = new Database();
const db = new Database({
  url: 'http://arango-hmdl:8529'
});
db.useBasicAuth('root', '5H2J01Y4WgoCHz1mSCqFSrectK2u');
const graph = db.graph('lirmm');

const main = async () => {
  const words = graph.vertexCollection('words');
  const relations = graph.edgeCollection('relations');

  const w1 = await words.save({name: 'bobby', weight: 10});
  const w2 = await words.save({name: 'bobette', weight: 5});
  const edge = await relations.save({type: 'gf'}, w1, w2);
};

const init = async () => {
  const info = await graph.create({
    edgeDefinitions: [
      {
        collection: 'relations',
        from: ['words'],
        to: ['words']
      }
    ]
  });

  await db.collection('words').createHashIndex('word');
};

init().then(() => {});
