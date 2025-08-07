module.exports = [
  {
    title: 'Assert a simple fact',
    command: '/assert John is the father of Mike.',
  },
  {
    title: 'Assert another fact',
    command: '/assert Mary is the mother of Mike.',
  },
  {
      title: 'Ask a simple question',
      command: '/query Who is the father of Mike?',
  },
  {
    title: 'Assert a rule',
    command: '/assert If X is the father of Y and Z is the mother of Y, then X and Z are parents of Y.',
  },
  {
      title: 'Ask a more complex question',
      command: '/query Who are the parents of Mike?',
  },
  {
      title: 'View the knowledge base',
      command: '/kb',
  }
];
