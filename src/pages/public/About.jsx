import { COMPANY } from '../../config/company';

export default function About() {
  return (
    <section className="container section prose">
      <h1>About Us</h1>
      <p>
        {COMPANY.name} is a trading and supply company serving customers across industries.
        Replace this text with your company story, history and values.
      </p>
    </section>
  );
}
