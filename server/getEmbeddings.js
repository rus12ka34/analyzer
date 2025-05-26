import { pipeline } from '@xenova/transformers';

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

export async function getEmbeddings(comments) {
    const output = await extractor(comments, { pooling: 'mean', normalize: true });
    const outputList = output.tolist();

    let ems = [];
    for (const em in outputList) {
      ems.push({ em: Array.from(outputList[em]), text: comments[em] });
    };

    return ems;
}