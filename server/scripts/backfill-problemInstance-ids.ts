import { ObjectId } from 'mongodb';
import { connectToMongoDB, closeMongoDB } from '../db';

async function run() {
  const db = await connectToMongoDB();
  const collection = db.collection('problemsets');

  const cursor = collection.find({ problemInstances: { $exists: true, $type: 'array', $ne: [] } });

  let processedSets = 0;
  let updatedSets = 0;
  let patchedInstances = 0;

  while (await cursor.hasNext()) {
    const doc: any = await cursor.next();
    if (!doc) continue;

    processedSets += 1;

    const instances: any[] = Array.isArray(doc.problemInstances) ? doc.problemInstances : [];
    let changed = false;

    const updatedInstances = instances.map((inst: any) => {
      if (inst && typeof inst === 'object') {
        if (!inst._id) {
          const newId = new ObjectId();
          inst._id = newId;
          // Mirror to legacy string id if not present
          if (!inst.id) inst.id = newId.toString();
          changed = true;
          patchedInstances += 1;
        }
      }
      return inst;
    });

    if (changed) {
      await collection.updateOne({ _id: doc._id }, { $set: { problemInstances: updatedInstances, updatedAt: new Date() } });
      updatedSets += 1;
    }
  }

  console.log(`[migration] ProblemSet documents scanned: ${processedSets}`);
  console.log(`[migration] ProblemSet documents updated: ${updatedSets}`);
  console.log(`[migration] problemInstances patched with _id: ${patchedInstances}`);

  await closeMongoDB();
}

run().catch(async (err) => {
  console.error('[migration] Failed:', err);
  try { await closeMongoDB(); } catch {}
  process.exit(1);
}); 