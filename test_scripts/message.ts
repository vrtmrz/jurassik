for (let i = 0; i < 20; i++) {
    console.log(`The subprocess! ${i}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
}
Deno.exit(0);
