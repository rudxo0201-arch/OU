declare module 'pptx-parser' {
  function parse(buffer: Buffer): Promise<any>;
  export default parse;
}

declare module 'hwp.js' {
  function parse(buffer: Buffer): any;
  export default parse;
}
