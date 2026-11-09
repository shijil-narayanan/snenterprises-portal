const services = [
  { title: 'Product Supply', text: 'Electrical accessories, cable management and earthing products.' },
  { title: 'Export Trading', text: 'Documentation and shipping support for international orders.' },
  { title: 'Custom Sourcing', text: 'We find the right parts to match your specifications.' },
];

export default function Services() {
  return (
    <section className="container section">
      <h1>Services</h1>
      <div className="feature-grid">
        {services.map((s) => (
          <div key={s.title} className="card">
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
