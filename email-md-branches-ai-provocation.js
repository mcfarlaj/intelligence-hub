const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 200 },
  children: [new TextRun({ text, ...opts })],
});

const doc = new Document({
  styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      p('Subject: A short conversation on branches, AI and the distribution question', { bold: true }),
      p(''),
      p('Dear [MD first name],'),
      p('I hope you are well. I wanted to drop you a note off the back of our Q1 quarterly provocation, which landed on a tension I think sits squarely in your patch and which I would value your perspective on.'),
      p('The short version: in a single week in March, five of the UK\u2019s largest banks deployed agentic AI in production. At the same time, PYMNTS Q1 data shows a 54/43 split between consumers using AI tools and those refusing to engage. The branch closure economics most of the industry is still working to were built on the assumption that digital migration would continue on a single trajectory. The evidence from this quarter suggests that trajectory has forked.'),
      p('What makes this interesting for branches specifically is the inversion that sits underneath it. Visa\u2019s Agentic Ready programme did not pick the digital natives. It picked Barclays, HSBC UK and Nationwide. a16z\u2019s Trust Wall thesis argues branch networks are appreciating AI distribution infrastructure rather than depreciating cost centres. If even half of that holds, the strategic value of the physical estate looks quite different in an agentic world to how it looked in the 2022 and 2023 closure cases.'),
      p('I am not arriving with answers, and certainly not with a paper to defend. I would simply value half an hour of your time to test the provocation against how you and your team are seeing it from the inside, and to explore whether there is a useful conversation to have between our teams on what an AI era means for the role and economics of the network.'),
      p('Entirely flexible on format. A coffee, a walk and talk, or a slot in your diary, whichever is easiest. Happy to share the Q1 provocation in advance if helpful, or to come in cold so we are reacting to the same blank page.'),
      p('With thanks, and I look forward to hearing from you.'),
      p(''),
      p('Best wishes,'),
      p('Jamie'),
      p(''),
      p('Jamie McFarlane'),
      p('Head of Strategy, Insight and Intelligence, Innovation', { italics: true }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/sessions/upbeat-magical-bardeen/mnt/Disruption Intelligence/email-md-branches-ai-provocation.docx', buf);
  console.log('done');
});
