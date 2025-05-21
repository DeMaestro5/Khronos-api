export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
  },
  linkup: {
    apiKey: process.env.LINKUP_API_KEY || '',
  },
};
