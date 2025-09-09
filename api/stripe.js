const Stripe = require('stripe');

const createCustomer = async () => {
    const customer = await stripe.customers.create({
        email: 'customer@example.com',
    });
    console.log('created customer:', customer);
    return customer;
}

module.exports = createCustomer;