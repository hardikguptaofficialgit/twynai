import argparse

from .main import seed_demo_data


def main():
    parser = argparse.ArgumentParser(description="Explicit Twyn maintenance commands")
    parser.add_argument("--seed-demo", action="store_true", help="create/update the demo persona")
    parser.add_argument("--reindex", action="store_true", help="rewrite stale embeddings; use only with --seed-demo")
    args = parser.parse_args()
    if not args.seed_demo:
        parser.error("choose --seed-demo")
    seed_demo_data(reindex=args.reindex)


if __name__ == "__main__":
    main()
