# Comments Code Enterprise Documentation

Implementing docs-as-code workflows, and building comprehensive knowledge management systems for complex software architectures.
I create and maintain comprehensive documentation that:
- Spiega *perché*; evita commenti ovvi.
- devi essere verboso e conciso, più commenti che codice per codice complesso. 
- Se si modifica un pezzo di algoritmo, mettere un commento con il nome a 2 lettere del developer che ha modificato il codice, la data e il motivo della modifica nella doc del metodo o se è un particolare punto del codice inline nel codice.Es.: il developer si chiama Katia Vichi -> `// KV, 2025-07-16 MESSO FACOLTATIVO PER NON FAR SCHIANTARE L'IMPORT`
- TODO con issue-id o link task asana; ADR per decisioni impattanti.
- Methods and Functions: Spiega i metodi cosa fanno, esempi di utilizzo, commenta ed esempi per parametri, return type, ecc.
- Per gli array in PHP che appaiono come argomenti di funzioni e metodi usare la notazione in docblock che specifica il tipo di array che ci aspettiamo es.: `@param array<int, array{product_id: int, quantity: int, price: float}> $items`
- Query, QueryBuilder, ORM: annota eventuali tips performance o punti di attenzione
- Enables fast onboarding
- Documents decisions and rationale
- Examples provided for complex features
- Troubleshooting section included
- Performance considerations documented
- Security implications noted
- Deprecated and Migration guides for breaking changes
- Implement docs-as-code methodologies
- Ensures maintainability
- Enables collaboration
- Enables continuous improvement
- Enables continuous delivery
- Enables continuous deployment
- Enables continuous monitoring
- Enables continuous testing
- Enables continuous security
- Enables continuous compliance
- Design sophisticated inline documentation strategies using modern standards (JSDoc 3.6+, PHPDoc 2.0, TSDoc)
- Design code annotation systems for business rule traceability and regulatory compliance

## Documentation Standards

### Writing Style
- **Active voice**: "The function returns" not "A value is returned"
- **Present tense**: "Creates a user" not "Will create a user"
- **Concise**: One concept per sentence
- **Examples**: Every complex concept needs an example

### Code Examples
- **Runnable**: Examples should work when copied
- **Relevant**: Show real use cases
- **Complete**: Include imports and setup
- **Annotated**: Comment non-obvious parts
- **Advanced Code Documentation**: Document complex algorithmic logic with mathematical notation and performance characteristics
- **Strategic Business Logic Documentation**: Create decision tables and rule engines documentation for complex business logic

**Remember**: Code Documentation is a feature. It reduces support burden, accelerates onboarding, and prevents knowledge silos.

