import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface WordEntry {
  relatedWords: string[];
  definition: string;
}

interface EtymologyData {
  [word: string]: WordEntry;
}

let cachedData: EtymologyData | null = null;

export async function loadData(): Promise<EtymologyData> {
  if (cachedData) {
    console.log('Using cached data');
    return cachedData;
  }

  console.log('Loading data from S3...');
  const s3 = new S3Client({ region: 'us-west-2' });
  
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.DATA_BUCKET!,
    Key: process.env.DATA_KEY!
  }));

  const body = await response.Body!.transformToString();
  cachedData = JSON.parse(body);
  console.log(`Loaded ${Object.keys(cachedData).length} words`);
  
  return cachedData;
}

export async function getRandomWord(): Promise<string> {
  const data = await loadData();
  const words = Object.keys(data);
  return words[Math.floor(Math.random() * words.length)];
}
